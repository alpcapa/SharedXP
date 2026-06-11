# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build
npm run preview    # Preview production build locally
npm test           # Run all tests (Vitest)
npx vitest run src/utils/date.test.js   # Run a single test file
```

Edge Functions (requires Supabase CLI):
```bash
supabase functions deploy booking-notify
supabase functions deploy send-email
supabase functions deploy events-sync
supabase functions deploy forgot-password
supabase functions deploy inbound-support
supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=... APP_URL=... SEND_EMAIL_HOOK_SECRET=... RESEND_WEBHOOK_SECRET=...
```

## Architecture

**React 18 / React Router v6 / Vite 5 / Supabase / No UI library / No TypeScript (frontend)**

### Auth is the central nervous system

`src/context/AuthContext.jsx` is the most important file in the codebase. It:
- Holds all auth state (`currentUser`, `authLoading`) in a React context
- Owns every user-mutating operation: `onEmailSignUp`, `onEmailLogin`, `onForgotPassword`, `onSocialLogin`, `onLogout`, `onUpdateProfile`, `onToggleHost`, `onSaveHostProfile`, `onTogglePauseHosting`, `onSaveHistory`, `onSaveHostHistory`
- Translates between Supabase DB rows (snake_case) and the JS user object (camelCase)
- `fetchUserProfile` loads the full user graph on session restore: `profiles` + `user_languages` + `user_sports` + `host_profiles` + `host_sports` + `host_sport_images` + `bookings` in parallel

**The auth props pattern**: `App.jsx` calls `useAuth()` once and spreads all returned values as props onto every page component (`<HomePage {...authActions} />`). Pages receive `currentUser`, `authLoading`, and all `on*` callbacks as flat props — not via `useAuth()` inside each page. New pages must follow this pattern.

### Data model (Supabase Postgres + RLS)

Migrations live in `supabase/migrations/` (run in numeric order). Migration 034 is a comments-only placeholder — the number was retired after the original draft was abandoned; see `034_placeholder.sql` for details. Do not create a new `034_*.sql`.
- `profiles` — one row per auth user; `is_host` and `is_admin` flags here
- `user_languages` / `user_sports` — up to 4 ordered entries per user
- `host_profiles` — one-to-one with `profiles` when `is_host=true`; holds payout/bank info, postcode, and geocoded coordinates
- `host_sports` — one `host_profiles` → many sports, each with availability, pricing, equipment; each sport has a `cancellation_policy` field
- `host_sport_images` — ordered gallery images per `host_sport`
- `bookings` — completed history with roles (`attended` / `hosted`); synced client-side via `syncBookings`
- `booking_requests` — active booking lifecycle: `pending → accepted → payment_pending → in_progress → completed` (or `declined / cancelled / disputed / resolved_*`)
- `messages` — per booking_request chat thread
- `invoices` — payment record per booking_request; `approved_at` signals admin approval (prerequisite for release); `released_at` signals payout (set by accounting after approval); `xp_earned` stores XP awarded to each participant
- `disputes` — opened by requester when disputing a completed booking; resolved by admin (sets `approved_at` for paid-host resolutions, which then routes to accounting for release)
- `external_events` — major international sports events (marathons, tennis, cycling, F1, etc.) sourced via the `events-sync` edge function
- `field_posts` — community experience feed posts sourced from completed bookings
- `field_post_likes` — like tracking per user per field post
- `cm_applications` — Community Manager applications (`pending → interview → accepted / declined`)
- `cm_profiles` — active CMs; each has a unique `invite_code` and tracks `city`, `country`, and status (`active / paused / revoked`)
- `cm_commissions` — per-invoice CM commission records; created by a DB trigger on invoice release
- `support_messages` — inbound support emails received via the `inbound-support` edge function; status `unread → read → replied → resolved`

Storage buckets: `Avatars` (user photos) and `host-sport-images` (host sport galleries). Both store public URLs after upload.

### Supabase client

`src/lib/supabase.js` exports the singleton `supabase` client. Auth uses `flowType: "implicit"` (token in URL hash) for compatibility with Safari and in-app browsers. If env vars are missing the client still initialises with placeholder values so the page renders a clear error rather than crashing.

### Booking flow

`src/hooks/useBookingRequests.js` manages the active booking lifecycle. `src/hooks/useHosts.js` fetches and filters the host list for Explore. Key points for booking requests:
- Auto-confirm logic runs **client-side**: when a booking's `auto_confirm_at` has passed and status is `in_progress`, the first participant to load the page transitions it to `completed`. It does **not** set `approved_at` or `released_at` — those are owned by the Admin Panel.
- Invoice payment release is a **two-step flow**: admin approves (sets `approved_at`) via the Experiences tab → Pending sub-tab; accounting releases (sets `released_at`) via the Accounting tab → Pending Payment sub-tab. This applies to completed sessions, auto-confirms, and dispute-resolved (paid-host) bookings alike.
- `refund_sent_at` on `booking_requests` is set by accounting (Accounting → Refunds tab) when a manual refund is sent; this changes the guest-facing status badge from "Cancelled · Refund pending" to "Cancelled · Refund sent".
- Platform fee is 15% + 5% tax, computed in `computeInvoice()`.
- Notifications are sent by calling `supabase.functions.invoke('booking-notify', …)` via `src/utils/sendNotification.js`.

### XP Loyalty Program

`src/utils/pricing.js` exports `toNSU(amount, currency)` — the canonical XP calculation. XP earned = `Math.ceil(amount / NSU_DIVISOR)` where `NSU_DIVISORS` maps ~178 currencies to their divisor (e.g. USD→1, EUR→1, JPY→100, TRY→40, KRW→1000). Unlisted currencies default to 1:1. XP is computed on the **gross booking amount** and both hosts and guests earn the same amount from a single booking. The program is currently in Foundation Phase (earn and display only; no redemption yet).

New pages: `/payment-history` (`PaymentHistoryPage`) shows invoices with per-transaction XP; `/loyalty-program` (`LoyaltyProgramPage`) documents program rules and NSU rates.

### Edge Functions (Deno / TypeScript)

`supabase/functions/booking-notify/index.ts` — transactional email dispatcher. Uses the **service role key** to read across RLS. Dispatches emails via Resend for all booking lifecycle events. Add new email types here and in `sendNotification.js`.

`supabase/functions/send-email/index.ts` — Supabase Auth hook for signup/recovery/invite emails. Must be registered in Supabase Dashboard → Authentication → Hooks → Send Email.

`supabase/functions/forgot-password/index.ts` — sends password-reset emails via Resend. Called by the `onForgotPassword` AuthContext callback.

`supabase/functions/auto-confirm/index.ts` — hourly server-side sweep (GitHub Actions, `:15` past each hour). Sends feedback emails for sessions where `experience_ends_at` has passed; auto-confirms bookings where `auto_confirm_at` has passed. Sets `approved_at` (not `released_at`) so auto-confirmed invoices still route through the Accounting tab.

`supabase/functions/events-sync/index.ts` — pulls major sports events from public sources and upserts them into the `external_events` table. Intended to run on a daily cron (pg_cron, GitHub Action, or Supabase scheduled trigger). Can also be invoked manually via HTTP POST with the service role key.

`supabase/functions/inbound-support/index.ts` — receives inbound emails forwarded by Resend (via Svix webhook) to support@sharedxp.com, persists them to `support_messages`, and sends an auto-reply directing the sender to the Help Center. Requires `RESEND_WEBHOOK_SECRET` (Svix signing secret) and `RESEND_API_KEY`.

**Edge Function runtime note:** All functions use `Deno.serve()`. Do not use the old `import { serve } from "https://deno.land/std@0.x.x/http/server.ts"` pattern — it causes bundling errors in Supabase deploy previews.

### Styling

All styles are in `src/styles/index.css` (~6500 lines). No CSS modules, no utility framework. Add styles directly to this file; there is no per-component stylesheet.

### Static reference data

`src/data/` contains static reference data:
- `majorEvents.js` — curated fallback list of major international sports events; used by the Events page when the `external_events` table is empty or unreachable.
- `sports.js` — canonical sport list used across the app.
- `countries.js` / `countryCities.js` — country and city reference data for location pickers.

Utility helpers beyond date/pricing:
- `src/utils/cancellationPolicy.js` — `CANCELLATION_POLICIES` config object (flexible / moderate / strict) and refund calculation helpers.
- `src/utils/cmCommission.js` — CM commission rate constant and `computeCmCommission(gross)`. Mirrors the `create_cm_commission_on_release` DB trigger.
- `src/utils/historyItem.js` — pure helpers for normalising and serialising booking history items; extracted from `HistoryPage` to keep the page focused on UI state.
- `src/utils/recoveryLink.js` — `hasRecoveryType({ search, hash })` detects password-recovery URLs from both query params and hash fragments.

### Tests

Only utility functions are tested. Test files sit alongside their source file (`*.test.js`). Vitest runs in `node` environment (configured in `vite.config.js`). There are no component or integration tests.

## Key conventions

- **No TypeScript in the frontend.** Edge Functions use TypeScript (Deno runtime).
- **camelCase in JS, snake_case in DB.** `AuthContext` translates at the boundary; never write snake_case keys in component code.
- **Languages and sports are always arrays of exactly 4 strings** (padded with empty strings). Use `normalizeLanguages` / `normalizeSports` from `AuthContext` when handling these arrays.
- **Birthday format is `DD/MM/YYYY`** (user input) or ISO `YYYY-MM-DD` (fallback). `src/utils/profileAge.js` handles both.
- **`getDateKey(year, month, day)`** takes a 0-indexed month (JS `Date` convention) and returns a zero-padded `YYYY-MM-DD` string.
- **Images are uploaded as blobs before saving.** Data URLs (from file pickers) must be converted to storage URLs via `uploadAvatarFromDataUrl` or the sport-image upload path in `onSaveHostProfile` before persisting to DB.
- **All booking mutations go through `useBookingRequests`**, not direct Supabase calls in pages.
- **Admin access** is gated on `profiles.is_admin = true`. Set this directly in the Supabase dashboard; there is no UI to grant admin.
- **No real payment processing.** All payments (guest charges, host payouts, CM commissions) are handled manually by accounting outside the platform — the app only records payment state (invoices, commission statuses, "Mark Paid", etc.) and provides the admin/user UIs. Stripe integration is planned for launch; all payment flows will be redesigned and wired up then. Do not add real payment logic in the meantime.
- **`experience_ends_at` and `auto_confirm_at` are always UTC.** When computing these from a `requested_date` string (`YYYY-MM-DD`), always parse with an explicit `Z` suffix: `new Date(\`${date}T00:00:00Z\`)`. Omitting `Z` makes JS interpret the string as local time, shifting the deadline by the browser's UTC offset.
