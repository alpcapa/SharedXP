# SharedXP — Functional and Technical Specifications Document (FTSD)

**Document type**: Internal reference  
**Status**: Living document — updated as features ship  
**Date**: June 2026  
**Stripe integration**: Out of scope for this version — see §10

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Authentication & Identity](#3-authentication--identity)
4. [User Profiles](#4-user-profiles)
5. [Host Profiles & Sports](#5-host-profiles--sports)
6. [Booking Lifecycle](#6-booking-lifecycle)
7. [Pricing, Fees & Invoicing](#7-pricing-fees--invoicing)
8. [XP Loyalty Program](#8-xp-loyalty-program)
9. [Cancellation & Refund Policy](#9-cancellation--refund-policy)
10. [Payments — Current State & Stripe (TBD)](#10-payments--current-state--stripe-tbd)
11. [Disputes](#11-disputes)
12. [Chat & Notifications](#12-chat--notifications)
13. [Community Manager (CM) Program](#13-community-manager-cm-program)
14. [The Field — Social Feed](#14-the-field--social-feed)
15. [Major Events Feed](#15-major-events-feed)
16. [Support System](#16-support-system)
17. [Admin Panel](#17-admin-panel)
18. [Data Model](#18-data-model)
19. [Edge Functions](#19-edge-functions)
20. [Frontend Architecture](#20-frontend-architecture)
21. [Security & Access Control](#21-security--access-control)
22. [Routing Reference](#22-routing-reference)

---

## 1. Product Overview

SharedXP is a peer-to-peer sports experience marketplace. Guests discover and book private sessions with vetted local hosts (athletes, coaches, enthusiasts) across a wide range of sports in cities worldwide. The platform handles discovery, booking coordination, post-session reviews, a loyalty XP program, a social feed of shared experiences, and a community manager referral network.

**Core actors**

| Actor | Description |
|---|---|
| **Guest** | Any authenticated user who books a session |
| **Host** | Authenticated user who has enabled `is_host` and configured at least one sport |
| **Community Manager (CM)** | Invited ambassador who earns commissions on referred bookings |
| **Admin / CS** | Internal team; flag set directly in DB (`profiles.is_admin`) |

**Technology stack**

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5 |
| Backend | Supabase (Postgres 15, Row-Level Security, Realtime, Storage) |
| Edge Functions | Deno / TypeScript (Supabase Functions) |
| Email | Resend API |
| Geocoding | Nominatim OpenStreetMap API |
| Data sync | TheSportsDB, OpenF1, Wikidata (via `events-sync` function) |

---

## 2. System Architecture

```
Browser (React SPA)
  │
  ├── Supabase JS client  ────────►  Supabase Platform
  │     flowType: "implicit"              ├── Postgres (RLS-enforced)
  │     (Safari / in-app browser safe)    ├── Auth (email + OAuth)
  │                                       ├── Realtime (messages)
  ├── supabase.functions.invoke()  ──►    ├── Storage (avatars, images)
  │                                       └── Edge Functions (Deno)
  └── Direct Nominatim call  ──────►  OSM geocoding (host location)
```

All frontend ↔ database communication goes through the Supabase JS client. Edge Functions are invoked for operations that require the service-role key (bypassing RLS) or external API calls (Resend, OSM, sports data APIs).

### State management

There is no global state library. State lives in:
- `AuthContext` — auth session, current user object, all user-mutating operations
- Custom hooks — `useBookingRequests`, `useHosts`, `useField`, etc.
- Component-local state — UI toggles, form state

`App.jsx` calls `useAuth()` once and spreads the returned values as flat props onto every page component. Pages must not call `useAuth()` directly; they receive `currentUser`, `authLoading`, and all `on*` callbacks as props.

---

## 3. Authentication & Identity

### 3.1 Sign-up methods

| Method | Flow |
|---|---|
| Email + password | Form → email confirmation link → profile creation |
| Google OAuth | Supabase OAuth redirect → profile seeded from metadata |
| Apple OAuth | Supabase OAuth redirect → profile seeded from metadata |

### 3.2 Email sign-up flow

1. User submits name, email, password, languages (up to 4), sports (up to 4), optional avatar.
2. Avatar (if provided) is uploaded to the `Avatars` storage bucket **before** account creation; the resulting public URL is stored in metadata.
3. `supabase.auth.signUp()` is called with `email`, `password`, and user metadata (`name`, `photo`, `languages`, `sports`, `invite_code`).
4. Supabase sends a confirmation email via the `send-email` Edge Function (registered as an Auth Hook in the Supabase Dashboard).
5. User clicks the confirmation link; the Auth Hook fires again (event `EMAIL_OTP`).
6. On confirmed session, `AuthContext.fetchUserProfile()` loads or creates the `profiles` row.
7. If a `pending_profiles` row exists (from OAuth partial flow), it is merged and then deleted.

### 3.3 OAuth flow

1. `supabase.auth.signInWithOAuth({ provider })` → redirect to provider.
2. Callback lands on `/auth/confirm`.
3. `AuthContext` detects `access_token` in URL hash; calls `fetchUserProfile()`.
4. If no profile exists, one is created from `user_metadata` (name, avatar_url from provider).
5. If profile is incomplete (missing languages/sports), user is redirected to onboarding.

### 3.4 Password recovery

1. User submits email on `/login` (forgot password).
2. `onForgotPassword()` in `AuthContext` calls `supabase.functions.invoke('forgot-password', { email, redirectTo })`.
3. Edge Function generates a recovery link using the service-role admin API and sends it via Resend.
4. User clicks link → lands on `/reset-password` → `hasRecoveryType()` utility detects recovery mode → user sets new password.

### 3.5 Session management

- `supabase.auth.onAuthStateChange()` drives all auth state in `AuthContext`.
- `sessionStorage` stores post-auth redirect targets so users land on the right page after OAuth callbacks.
- Recovery sessions are detected via `hasRecoveryType({ search, hash })` which inspects both query params and hash fragments (needed for compatibility with different OAuth callback formats).
- Accounts with `suspended_at` or `closed_at` populated cannot log in; the client checks these flags after loading the profile.

---

## 4. User Profiles

### 4.1 Profile data

| Field | Notes |
|---|---|
| `name` | Display name |
| `email` | Synced from auth |
| `photo` | URL in `Avatars` storage bucket |
| `birthday` | `DD/MM/YYYY` (user input) or `YYYY-MM-DD` (ISO fallback); handled by `src/utils/profileAge.js` |
| `gender` | Optional |
| `address`, `city`, `country` | Location |
| `phone` | Optional |
| `is_host` | Toggle; creates/deletes `host_profiles` row |
| `is_admin` | Set directly in DB; never via UI |
| `agreed_to_terms` | Boolean; required before booking |
| `agreed_to_promotions` | Optional marketing consent |
| `signed_up_at` | Timestamp |
| `suspended_at` | Set by admin; blocks login |
| `closed_at` | Account closure; triggers GDPR erasure |

### 4.2 Related tables

- `user_languages` — up to 4 rows; each has a `position` (0–3) and `language` string
- `user_sports` — up to 4 rows; same structure with `sport` string

Both arrays are always normalised to exactly 4 entries (padded with empty strings) by `normalizeLanguages` / `normalizeSports` helpers in `AuthContext`.

### 4.3 Profile loading

`fetchUserProfile(userId)` runs 6 parallel queries:

```
profiles
user_languages
user_sports
host_profiles (+ host_sports + host_sport_images)
bookings (history)
booking_requests (active bookings — requester or host)
```

All results are merged into a single camelCase `currentUser` object. This is the only source of truth for user data in the frontend.

### 4.4 Naming conventions

The boundary between DB and JS is `AuthContext`. **All DB keys are snake_case; all JS keys are camelCase.** No other file should reference snake_case field names.

---

## 5. Host Profiles & Sports

### 5.1 Becoming a host

1. User visits `/become-a-host` or toggles "Become a Host" in profile settings.
2. `onToggleHost(true)` in `AuthContext` creates a `host_profiles` row.
3. User is redirected to `/host-settings` to complete their host profile.

### 5.2 Host profile data (`host_profiles`)

| Field | Notes |
|---|---|
| `city`, `postcode`, `country` | Physical location |
| `latitude`, `longitude` | Geocoded on save via Nominatim OSM |
| `pause_hosting` | Boolean; hides host from search |
| `bank_details_complete` | Boolean flag; set true when all bank fields filled |
| `payout_currency` | Currency for payouts |
| `stripe_email`, `account_holder_name`, `citizen_id`, `tax_number`, `bank_account`, `routing_number` | Bank/payout information (held for manual processing; Stripe integration TBD) |
| `agree_host_terms`, `agree_accuracy` | Agreement checkboxes |

### 5.3 Host sports (`host_sports`)

Each host can list multiple sports. Per-sport fields:

| Field | Notes |
|---|---|
| `sport` | From canonical `src/data/sports.js` list |
| `description` | Short tagline |
| `about` | Long-form description |
| `pricing` | Numeric amount in `pricing_currency` |
| `pricing_currency` | ISO 4217 currency code |
| `level` | Difficulty level for guests |
| `paused` | Per-sport pause (independent of host-level pause) |
| `equipment_provided` | Boolean |
| `equipment_details` | Free-text description |
| `cancellation_policy` | `flexible` \| `moderate` \| `strict` |
| `availability_days` | Array of day names |
| `availability_start_time` / `availability_end_time` | Time range strings |

### 5.4 Sport images (`host_sport_images`)

- Up to N images per `host_sport`; each has a `position` for ordering
- Images are uploaded to the `host-sport-images` storage bucket before saving
- Stored as public URLs; data URLs from file pickers must be converted before persisting

### 5.5 Geocoding

When `onSaveHostProfile()` is called, the host's postcode + country is geocoded via the Nominatim API. The resulting `latitude` and `longitude` are stored on `host_profiles` and used to render the host's position on the Explore map.

### 5.6 Host visibility rules

A host appears in search results only if **all** of the following are true:
- `host_profiles.pause_hosting = false`
- Account is not suspended (`profiles.suspended_at IS NULL`)
- Account is not closed (`profiles.closed_at IS NULL`)
- At least one non-paused `host_sports` row exists

---

## 6. Booking Lifecycle

### 6.1 Status machine

```
pending
  ├── accepted  ──► payment_pending  ──► in_progress  ──► completed
  │                                           │
  │                                           └──► disputed  ──► resolved_paid_host
  │                                                             └──► resolved_refunded
  ├── declined
  └── cancelled
```

| Status | Meaning |
|---|---|
| `pending` | Guest has submitted a request; awaiting host response |
| `accepted` | Host accepted; guest must proceed to payment |
| `payment_pending` | Payment step initiated (UI state; no real payment yet) |
| `in_progress` | Payment confirmed; experience window is open |
| `completed` | Both parties confirmed or auto-confirm triggered |
| `declined` | Host declined with a reason |
| `cancelled` | Cancelled by requester or host before completion |
| `disputed` | Guest opened a dispute instead of confirming |
| `resolved_paid_host` | Admin resolved dispute in host's favour |
| `resolved_refunded` | Admin resolved dispute in guest's favour |

### 6.2 Key timestamps

| Field | Set when |
|---|---|
| `requested_date` | Guest-selected date for the session |
| `requested_time` | Guest-selected start time |
| `experience_ends_at` | Midnight (00:00:00 UTC) of the day after `requested_date`; triggers feedback email |
| `auto_confirm_at` | 72 hours after `experience_ends_at`; triggers auto-completion |

### 6.3 Auto-confirmation

Auto-confirm runs in two places — a server-side cron as the primary trigger and a client-side check as an instant fallback when the user is already in the app:

**Server-side (primary):** The `auto-confirm` Edge Function runs every hour via GitHub Actions (`.github/workflows/auto-confirm.yml`, `:15` past each hour). It:
1. Finds all `in_progress` bookings where `auto_confirm_at <= now()`.
2. Transitions each to `completed` and sets `updated_at`.
3. Releases the invoice (`released_at = now()`) using an atomic `IS NULL` guard.
4. Sends the `experience_confirmed_to_host` notification — only if this run claimed the `released_at` field, preventing duplicates when a client is also online.

The same function also handles the earlier feedback email: for bookings where `experience_ends_at` has passed but `auto_confirm_at` hasn't yet and `feedback_email_sent_at IS NULL`, it atomically claims the field and sends `experience_completed_to_requester`.

**Client-side (fast path):** `useBookingRequests.js` runs the same checks on every fetch using the same atomic guards. If the user opens the app before the hourly function fires, they get an immediate transition with no wait.

### 6.4 Booking request data

| Field | Notes |
|---|---|
| `requester_id` | Guest user ID |
| `host_id` | Host user ID |
| `sport` | Selected sport |
| `requested_date` | ISO date string |
| `requested_time` | Time string |
| `price` | Gross amount (host's listed price) |
| `currency` | ISO 4217 code |
| `status` | See §6.1 |
| `decline_reason` | Free text; set when host declines |
| `refund_pct` | `0` \| `50` \| `100`; calculated at cancellation time |
| `guest_rating` | 1–5 integer |
| `guest_host_ratings` | JSONB; detailed attribute ratings (punctuality, etc.) |
| `guest_review` | Free text |
| `guest_photos` | Array of storage URLs |
| `host_rating` | 1–5 integer |
| `host_review` | Free text |
| `host_rated_at` | Timestamp |

### 6.5 History sync

The `bookings` table is a denormalised history mirror. When a booking is completed:
1. Two rows are upserted into `bookings`: one for the guest (`role = 'attended'`), one for the host (`role = 'hosted'`).
2. `syncBookings()` in `AuthContext` handles this upsert.
3. The `bookings` table is used for the history page and CM eligibility check.

---

## 7. Pricing, Fees & Invoicing

### 7.1 Fee structure

| Component | Formula |
|---|---|
| Gross amount | Host's listed price (paid by guest) |
| Platform commission | `gross × 0.15` |
| Tax | `gross × 0.05` |
| Net payout | `gross − commission − tax = gross × 0.80` |

Example: Guest pays €100 → host receives €80, platform retains €20.

The `computeInvoice(gross, currency)` function in `src/utils/pricing.js` performs this calculation and returns all four values.

### 7.2 Invoice record (`invoices`)

| Field | Notes |
|---|---|
| `booking_request_id` | FK to `booking_requests` |
| `gross_amount` | As above |
| `platform_commission` | 15% of gross |
| `tax` | 5% of gross |
| `net_amount` | 80% of gross |
| `currency` | ISO 4217 |
| `xp_earned` | Computed at payment time; stored immutably |
| `paid_at` | When guest payment was confirmed |
| `released_at` | When host payout was released (set at completion/resolution) |

An invoice is created when the booking transitions to `in_progress` (payment step). `released_at` is set at completion or dispute resolution.

---

## 8. XP Loyalty Program

### 8.1 Overview

The XP (Experience Points) system rewards guests and hosts equally for completed sessions. XP is denominated in Normalized Spending Units (NSU) to ensure cross-currency fairness. The program is currently in **Foundation Phase**: earn and display only; no redemption yet.

### 8.2 NSU calculation

```js
XP = Math.ceil(gross_amount / NSU_DIVISOR[currency])
```

Divisors normalise each currency's unit to approximately USD 1. Examples:

| Currency | Divisor | Meaning |
|---|---|---|
| USD, EUR, GBP | 1 | 1 USD = 1 XP |
| JPY | 100 | 100 JPY ≈ 1 XP |
| TRY | 40 | 40 TRY ≈ 1 XP |
| KRW | 1000 | 1000 KRW ≈ 1 XP |
| ARS | 1000 | 1000 ARS ≈ 1 XP |

`NSU_DIVISORS` in `src/utils/pricing.js` maps ~178 currencies. Unlisted currencies default to divisor `1`.

### 8.3 XP lifecycle

| Event | Effect on XP |
|---|---|
| Booking paid (invoice created) | `xp_earned = CEIL(gross / divisor)`; stored on invoice |
| Full refund (`refund_pct = 100`) | `xp_earned` reclaimed to zero |
| Partial refund (`refund_pct = 50`) | `xp_earned` reduced proportionally |
| No refund (`refund_pct = 0`) | `xp_earned` unchanged |

Both the guest and the host earn the same XP from a single booking.

### 8.4 Display surfaces

- `/payment-history` — per-transaction XP breakdown
- `/loyalty-program` — program rules, NSU rate table
- Booking confirmation screen — shows XP to be earned

---

## 9. Cancellation & Refund Policy

### 9.1 Policy tiers

Hosts set a cancellation policy per sport at the time of listing. Three options:

| Policy | Full refund | Partial refund (50%) | No refund |
|---|---|---|---|
| **Flexible** | ≥24 h before session | — | <24 h |
| **Moderate** | ≥5 days before session | 1–5 days | <24 h |
| **Strict** | — | ≥7 days before session | <7 days |

### 9.2 Refund calculation

`computeRefundPct(policy, hoursUntilSession)` in `src/utils/cancellationPolicy.js` returns `0`, `50`, or `100`.

`hoursUntilSession` = `(requested_date_time − now) / 3_600_000`.

The resulting `refund_pct` is stored on the `booking_requests` row at cancellation time. Downstream invoice and XP adjustments use this stored value.

### 9.3 Policy enforcement

- Cancellation is allowed by both guest and host at any stage before `completed`.
- The policy determines the **refund percentage only**; cancellation itself is always permitted.
- Refund execution is manual (admin marks refund issued); the `refund_pct` field records the obligation.

---

## 10. Payments — Current State & Stripe (TBD)

### 10.1 Current state (manual accounting)

There is no live payment processing. The flow is:

1. Guest visits `/payment/:bookingRequestId` and clicks "Pay Now".
2. The booking transitions to `in_progress`; an `invoices` row is created with calculated fees.
3. `paid_at` is set immediately (simulated payment confirmation).
4. The CS/accounting team handles actual money collection and host payout outside the platform.
5. Host bank details are collected in `host_profiles` for this manual process.

The `invoices` table tracks all financial obligations and serves as the source of truth for accounting.

### 10.2 Stripe integration (TBD)

Stripe integration is **not in scope for this version**. When implemented it will:

- Replace the simulated "Pay Now" button with a real Stripe Payment Intent flow
- Use Stripe Connect for host onboarding and automated payouts
- Handle webhook events (`payment_intent.succeeded`, `charge.refunded`, etc.)
- Set `invoices.paid_at` from the Stripe webhook rather than client-side
- Automate refund execution based on `refund_pct`

All current payment flows are designed to be fully compatible with a Stripe drop-in — no schema changes are anticipated for the core booking/invoice model.

---

## 11. Disputes

### 11.1 Opening a dispute

A guest can open a dispute instead of confirming a completed session:
1. After `experience_ends_at`, guest sees a "Dispute" option on the booking.
2. Guest submits an explanation (free text).
3. `booking_requests.status` → `disputed`.
4. Invoice payout is held (`released_at` remains NULL).
5. Notification sent to host and CS team.

### 11.2 Host response

1. Host visits `/dispute-response/:disputeId`.
2. Host submits their side of the story (free text).
3. `disputes.host_response` and `disputes.host_responded_at` populated.
4. CS notified.

### 11.3 Admin resolution

Admin reviews both sides in the Admin Panel disputes queue:

| Resolution | Outcome |
|---|---|
| `resolved_paid_host` | Invoice released to host; `released_at` set; host notified |
| `resolved_refunded` | Refund issued to guest; `xp_earned` zeroed; guest notified |

Admin adds notes (markdown, with timestamp) stored in `disputes.admin_notes`.

### 11.4 Disputes data (`disputes`)

| Field | Notes |
|---|---|
| `booking_request_id` | FK; unique (one dispute per booking) |
| `requester_explanation` | Guest's statement |
| `host_response` | Host's statement |
| `opened_at` | When dispute was created |
| `host_responded_at` | When host submitted response |
| `resolved_at` | When admin resolved |
| `resolution` | `refunded` \| `paid_host` |
| `resolved_by` | Admin user ID |
| `admin_notes` | JSON array of `{author, timestamp, note}` objects |

---

## 12. Chat & Notifications

### 12.1 Chat

- One chat thread per `booking_request`.
- Messages are stored in the `messages` table.
- Supabase Realtime subscription enables live updates without polling.
- `read_at` tracked per message; unread count aggregated on booking requests.
- Only the requester and host for a given booking can read/send messages (RLS-enforced).

### 12.2 Transactional email notifications

All notification emails are dispatched via the `booking-notify` Edge Function, called by `src/utils/sendNotification.js`.

| Event | Recipients |
|---|---|
| New booking request | Host |
| Request accepted | Guest |
| Request declined | Guest |
| Payment confirmed | Host |
| Experience confirmed | Both |
| Auto-confirm triggered | Both |
| Session completed (ask for rating) | Both |
| Dispute opened | Host + CS |
| Dispute response submitted | CS |
| Dispute resolved | Guest + Host |
| New chat message | Other party |

Email content is rendered as HTML inside the Edge Function using Resend's API.

---

## 13. Community Manager (CM) Program

### 13.1 Overview

CMs are trusted host ambassadors who recruit new users with a personal invite code and earn a commission on their referred guests' completed bookings.

### 13.2 Eligibility & recruitment

- A host becomes eligible after completing 3+ bookings (either role).
- On the 3rd completed booking, an eligibility popup appears in the UI (once per session; can be permanently dismissed).
- Host fills out an application form at `/community-manager-policy`.

### 13.3 Application flow

| Status | Meaning |
|---|---|
| `pending` | Application submitted; awaiting admin review |
| `interview` | Admin has moved to interview stage |
| `accepted` | CM profile created; invite code issued |
| `declined` | Application rejected |

Admin moves applications through stages via the Admin Panel, optionally adding notes.

### 13.4 CM profile & invite codes

- `cm_profiles` row created when application is accepted.
- `invite_code` format: `SXP-{CITY3}-{4CHARS}` (e.g., `SXP-NYC-A1B2`).
- Invite codes are stored in `localStorage` when a new user signs up via a CM link.
- On first profile load, the invite code is recorded in `cm_referrals`.

### 13.5 Commission structure

| Field | Value |
|---|---|
| Commission rate | 5% of gross booking amount |
| Trigger | `invoices.released_at` transitions from NULL (invoice released) |
| Eligibility | CM's referred user must be the **requester** (not the host) |
| Attribution | One lifetime attribution per referred user |

Commission records are created automatically by the `create_cm_commission_on_release` DB trigger when an invoice is released.

### 13.6 Commission lifecycle

```
pending → approved → paid
```

**Auto-approval rules** (either condition triggers):
1. **Threshold**: Sum of pending commissions for a CM+currency pair exceeds €25 equivalent — all pending for that pair are approved.
2. **Age fallback**: The `cm-payout-sweep` Edge Function runs daily and auto-approves pending commissions that are ≥45 days old.

**Payment**: Manual; admin marks commissions as paid via the Admin Panel. An optional payout notification email is sent to the CM.

### 13.7 Commission data (`cm_commissions`)

| Field | Notes |
|---|---|
| `cm_id` | FK to `cm_profiles` |
| `booking_request_id` | FK; unique (one commission per booking) |
| `gmv` | Gross booking amount |
| `commission_amount` | `gmv × 0.05` |
| `currency` | ISO 4217 |
| `status` | `pending` \| `approved` \| `paid` |
| `approved_at` | When auto-approved or manually approved |
| `paid_at` | When marked paid |
| `payout_notified_at` | When payout email sent |

---

## 14. The Field — Social Feed

### 14.1 Overview

"The Field" (`/the-field`) is a public read-only social feed of completed booking experiences shared by users. It builds social proof and community engagement.

### 14.2 Post creation

After a booking is completed and rated, the user sees an option to share the session to The Field. This creates a `field_posts` row with:
- Sport, city, country, caption
- Up to N photos (from `booking_requests.guest_photos`)
- Reference to the source `booking_request_id`
- Counterparty display info (name, photo, role)

### 14.3 Post data (`field_posts`)

| Field | Notes |
|---|---|
| `poster_id` | FK to `profiles` |
| `role` | `attended` \| `hosted` |
| `host_name` / `host_photo` | Counterparty display info |
| `sport`, `city`, `country` | Location & activity |
| `caption` | Free text |
| `photos` | Array of storage URLs |
| `likes` | Integer counter |
| `source_request_id` | FK to `booking_requests` (nullable) |
| `admin_notes` | JSON note history |
| `suspended_at` | Set by admin to hide post |

### 14.4 Interactions

- **Likes**: `field_post_likes` table; unique per user per post; counter on `field_posts.likes`.
- **Reports**: `field_post_reports`; any user can report; statuses `pending` / `dismissed`.
- **Suspension**: Admin can suspend a post via Admin Panel; suspended posts are hidden from the feed.

### 14.5 Access control

- Unauthenticated users can read the feed (public RLS policy).
- Only the poster can delete their own post.
- Admin can suspend/unsuspend via the Admin Panel.

---

## 15. Major Events Feed

### 15.1 Overview

`/events` displays a curated list of major international sporting events (marathons, Grand Slams, cycling tours, F1, World Cup, Olympics, etc.) to inspire users and drive booking intent.

### 15.2 Data sources

| Source | Sports |
|---|---|
| TheSportsDB | Football, tennis, cycling, athletics, rugby |
| OpenF1 API | Formula 1 |
| Wikidata | Olympics, major multi-sport events |

The `events-sync` Edge Function pulls from these sources daily and upserts into `external_events`.

### 15.3 Fallback

If `external_events` is empty or unreachable, the frontend falls back to `src/data/majorEvents.js`, a curated static list of 40+ events.

### 15.4 Event data (`external_events`)

| Field | Notes |
|---|---|
| `source` | API source identifier |
| `source_id` | External ID for deduplication |
| `title` | Event name |
| `sport` | Sport category |
| `category` | Sub-category (Grand Slam, Tour, etc.) |
| `country`, `city`, `venue` | Location |
| `starts_at`, `ends_at` | Date range |
| `url` | Official event URL |
| `image_url` | Event image |
| `description` | Short description |
| `last_synced_at` | When last updated |

---

## 16. Support System

### 16.1 Inbound email support

Emails sent to `support@sharedxp.com` are forwarded by Resend via a Svix webhook to the `inbound-support` Edge Function. The function:
1. Verifies the Svix webhook signature using `RESEND_WEBHOOK_SECRET`.
2. Parses sender name, email, subject, body (text + HTML).
3. Inserts a `support_messages` row.
4. Sends an auto-reply directing the sender to the Help Center.

### 16.2 Contact form

`/contact` renders a contact form. Submission calls the `contact-support` Edge Function which inserts a `support_messages` row.

### 16.3 Support message lifecycle

| Status | Meaning |
|---|---|
| `unread` | New; not yet seen by CS |
| `read` | Opened by CS |
| `replied` | CS has sent a reply |
| `resolved` | Ticket closed |

Support messages are visible only to admin users (RLS-enforced).

---

## 17. Admin Panel

### 17.1 Access

`/admin` is accessible only to users with `profiles.is_admin = true`. The flag is set directly in the Supabase Dashboard; there is no UI to grant admin.

### 17.2 Feature areas

| Area | Capabilities |
|---|---|
| **CM Applications** | View queue; move to interview, accept (creates CM profile + invite code), decline; add timestamped markdown notes |
| **CM Profiles** | View active CMs; pause, revoke, reactivate; edit city/country/payment info; view referral and commission history |
| **Commissions** | Approve pending commissions; mark as paid; send payout notification email |
| **Disputes** | View open disputes; read both sides; resolve as refunded or paid-host; add admin notes |
| **Profiles** | Search users; suspend (with reason + date); close account; add admin notes |
| **Field Posts** | View reported posts; dismiss report; suspend post |
| **Support Messages** | View unread messages; mark read/replied/resolved |

### 17.3 Admin notes format

All admin note fields store a JSON array:
```json
[
  {
    "author": "admin@sharedxp.com",
    "timestamp": "2026-06-01T10:00:00Z",
    "note": "Markdown content here"
  }
]
```

Notes are append-only; no editing or deletion.

---

## 18. Data Model

### 18.1 Table summary

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user; core identity + flags |
| `pending_profiles` | Temporary storage during OAuth/email confirmation partial flows |
| `user_languages` | Up to 4 languages per user with position |
| `user_sports` | Up to 4 sports per user with position |
| `host_profiles` | One-to-one with `profiles` when `is_host=true`; location, bank info |
| `host_sports` | One host → many sports; pricing, availability, policy per sport |
| `host_sport_images` | Ordered gallery images per `host_sport` |
| `booking_requests` | Active booking lifecycle; source of truth for current state |
| `bookings` | Denormalised history mirror; one row per user per session |
| `invoices` | Financial record per completed booking; fees and XP |
| `messages` | Per-booking chat; real-time enabled |
| `disputes` | One dispute per booking; opened by guest |
| `external_events` | Major sporting events from external APIs |
| `field_posts` | Shared experience feed posts |
| `field_post_likes` | Like tracking; unique per user per post |
| `field_post_reports` | Report queue for moderation |
| `cm_applications` | CM recruitment pipeline |
| `cm_profiles` | Active CM records with invite codes |
| `cm_referrals` | One-time attribution: CM → referred user |
| `cm_commissions` | Per-invoice commission records |
| `support_messages` | Inbound and contact-form support tickets |

### 18.2 Migration history

Migrations live in `supabase/migrations/` numbered 001–038 (034 intentionally absent). Run in numeric order. Never edit a shipped migration; add new migrations instead.

### 18.3 Row-Level Security

RLS is enabled on all tables. Key policy patterns:

| Pattern | Example |
|---|---|
| Owner-only read/write | `profiles`: user can only read/update their own row |
| Host visibility | `host_profiles`: any authenticated user can read |
| Admin-only | `support_messages`: only `is_admin = true` users |
| Public read | `field_posts`, `external_events`: unauthenticated SELECT allowed |
| Booking party | `messages`, `booking_requests`: only requester or host |

---

## 19. Edge Functions

All Edge Functions run on the Deno runtime (TypeScript). They use the **service-role key** to bypass RLS where needed. Deployed via `supabase functions deploy <name>`.

| Function | Trigger | Purpose |
|---|---|---|
| `booking-notify` | Client invoke (via `sendNotification.js`) | Dispatches transactional emails for all booking lifecycle events via Resend |
| `send-email` | Supabase Auth Hook | Handles signup confirmation, magic link, and recovery emails |
| `forgot-password` | Client invoke | Generates recovery link via admin API; sends via Resend |
| `auto-confirm` | Hourly cron (GitHub Actions, `:15` past each hour) | Sends feedback emails and auto-confirms expired bookings; server-side safety net for the client-side check in `useBookingRequests.js` |
| `events-sync` | Daily cron (GitHub Action) | Fetches major sports events from external APIs; upserts to `external_events` |
| `inbound-support` | Resend Svix webhook | Receives forwarded support emails; inserts to `support_messages`; sends auto-reply |
| `contact-support` | Client invoke | Receives contact form submissions; inserts to `support_messages` |
| `cm-payout-sweep` | Daily cron (GitHub Action, 06:00 UTC) | Auto-approves CM commissions ≥45 days old; notifies admin |
| `gdpr-erasure` | Client invoke (account closure) | Anonymises PII on closed accounts; preserves financial history |

### Required secrets

```
RESEND_API_KEY
RESEND_FROM_EMAIL
APP_URL
SEND_EMAIL_HOOK_SECRET
RESEND_WEBHOOK_SECRET
```

Set via `supabase secrets set KEY=value`.

---

## 20. Frontend Architecture

### 20.1 File structure

```
src/
  App.jsx              # Router; calls useAuth(); spreads props to all pages
  context/
    AuthContext.jsx    # Auth state; all user mutations; DB↔JS translation
  hooks/
    useBookingRequests.js  # Active booking lifecycle
    useHosts.js            # Host discovery + filtering
    useField.js            # Field feed
    ...
  pages/               # One file per route
  components/          # Shared UI components
  utils/
    pricing.js         # computeInvoice(), toNSU(), NSU_DIVISORS
    cancellationPolicy.js
    cmCommission.js
    historyItem.js
    profileAge.js
    recoveryLink.js
    sendNotification.js
    date.js            # getDateKey() and date helpers
  data/
    sports.js          # Canonical sport list
    majorEvents.js     # Fallback events list
    countries.js
    countryCities.js
  lib/
    supabase.js        # Singleton Supabase client
  styles/
    index.css          # All styles (~6 500 lines); no CSS modules
```

### 20.2 Styling

- Single global stylesheet: `src/styles/index.css`
- No utility framework (no Tailwind)
- No per-component CSS files
- All new styles go in `index.css`

### 20.3 Testing

- Test framework: Vitest (node environment)
- Only utility functions are tested
- Test files colocated with source: `src/utils/pricing.test.js`, `src/utils/date.test.js`, etc.
- No component or integration tests
- Run: `npm test` (all) or `npx vitest run <file>` (single file)

### 20.4 Build & dev

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build
npm run preview    # Preview production build
```

### 20.5 Environment variables

The Supabase client (`src/lib/supabase.js`) reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If missing, the client initialises with placeholder values and the page renders a clear configuration error rather than crashing.

---

## 21. Security & Access Control

### 21.1 Authentication

- JWT-based; managed by Supabase Auth
- `flowType: "implicit"` (token in URL hash) for Safari and in-app browser compatibility
- OAuth via Supabase's built-in Google and Apple providers

### 21.2 Row-Level Security

All tables enforce RLS policies at the database level. The frontend enforces the same rules in the UI, but the database is the authoritative enforcement layer. The service-role key (used only in Edge Functions) bypasses RLS.

### 21.3 Admin access

- `profiles.is_admin` is the only gate on admin functionality
- Must be set directly in the Supabase Dashboard
- No UI exists to grant or revoke admin; intentional

### 21.4 Input handling

- No TypeScript in the frontend; all user input is treated as untrusted
- Supabase parameterised queries prevent SQL injection
- File uploads are validated for type/size before storage bucket upload
- Avatar and image URLs are always from Supabase Storage (no arbitrary URL injection)

### 21.5 Account suspension & closure

- Suspended accounts (`suspended_at IS NOT NULL`): cannot log in; soft block checked after session load
- Closed accounts (`closed_at IS NOT NULL`): `gdpr-erasure` function anonymises PII; financial records preserved for audit

---

## 22. Routing Reference

| Route | Component | Auth required |
|---|---|---|
| `/` | `HomePage` | No |
| `/locals` | `ExplorePage` | No |
| `/the-field` | `FieldPage` | No |
| `/events` | `EventsPage` | No |
| `/login` | `LoginPage` | No |
| `/signup` | `SignupPage` | No |
| `/reset-password` | `ResetPasswordPage` | No |
| `/auth/confirm` | `AuthConfirmPage` | No |
| `/user/:userId` | `ProfilePage` | No (public) |
| `/edit-profile` | `EditProfilePage` | Yes |
| `/become-a-host` | `BecomeAHostPage` | Yes |
| `/host-settings` | `HostPage` | Yes (host) |
| `/history` | `HistoryPage` | Yes |
| `/payment/:bookingRequestId` | `PaymentPage` | Yes |
| `/chat/:bookingRequestId` | `ChatPage` | Yes |
| `/payment-history` | `PaymentHistoryPage` | Yes |
| `/dispute-response/:disputeId` | `DisputeResponsePage` | Yes |
| `/loyalty-program` | `LoyaltyProgramPage` | No |
| `/admin` | `AdminPage` | Yes (admin) |
| `/contact` | `ContactPage` | No |
| `/help` | `HelpPage` | No |
| `/follow` | `FollowPage` | No |
| `/terms-and-conditions` | Static | No |
| `/privacy-notice` | Static | No |
| `/cancellation-policy` | Static | No |
| `/safety-and-risk-policy` | Static | No |
| `/payments-and-payout-terms` | Static | No |
| `/community-manager-policy` | Static / Form | No |
| `/disclaimers` | Static | No |
| `/legal` | Static | No |
| `/about` | Static | No |
| `/content-and-intellectual-property-policy` | Static | No |

---

*End of document. For Stripe integration specifications, a separate addendum will be written once integration design is finalised.*
