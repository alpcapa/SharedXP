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
supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=... APP_URL=... SEND_EMAIL_HOOK_SECRET=...
```

## Architecture

**React 18 / React Router v6 / Vite 5 / Supabase / No UI library / No TypeScript (frontend)**

### Auth is the central nervous system

`src/context/AuthContext.jsx` is the most important file in the codebase. It:
- Holds all auth state (`currentUser`, `authLoading`) in a React context
- Owns every user-mutating operation: `onEmailSignUp`, `onEmailLogin`, `onSocialLogin`, `onLogout`, `onUpdateProfile`, `onToggleHost`, `onSaveHostProfile`, `onTogglePauseHosting`, `onSaveHistory`, `onSaveHostHistory`
- Translates between Supabase DB rows (snake_case) and the JS user object (camelCase)
- `fetchUserProfile` loads the full user graph on session restore: `profiles` + `user_languages` + `user_sports` + `host_profiles` + `host_sports` + `host_sport_images` + `bookings` in parallel

**The auth props pattern**: `App.jsx` calls `useAuth()` once and spreads all returned values as props onto every page component (`<HomePage {...authActions} />`). Pages receive `currentUser`, `authLoading`, and all `on*` callbacks as flat props — not via `useAuth()` inside each page. New pages must follow this pattern.

### Data model (Supabase Postgres + RLS)

Migrations live in `supabase/migrations/` (run in numeric order):
- `profiles` — one row per auth user; `is_host` and `is_admin` flags here
- `user_languages` / `user_sports` — up to 4 ordered entries per user
- `host_profiles` — one-to-one with `profiles` when `is_host=true`; holds payout/bank info
- `host_sports` — one `host_profiles` → many sports, each with availability, pricing, equipment
- `host_sport_images` — ordered gallery images per `host_sport`
- `bookings` — completed history with roles (`attended` / `hosted`); synced client-side via `syncBookings`
- `booking_requests` — active booking lifecycle: `pending → accepted → payment_pending → in_progress → completed` (or `declined / cancelled / disputed / resolved_*`)
- `messages` — per booking_request chat thread
- `invoices` — payment record per booking_request; `released_at` signals payout
- `disputes` — opened by requester when disputing a completed booking; resolved by admin

Storage buckets: `Avatars` (user photos) and `host-sport-images` (host sport galleries). Both store public URLs after upload.

### Supabase client

`src/lib/supabase.js` exports the singleton `supabase` client. Auth uses `flowType: "implicit"` (token in URL hash) for compatibility with Safari and in-app browsers. If env vars are missing the client still initialises with placeholder values so the page renders a clear error rather than crashing.

### Booking flow

`src/hooks/useBookingRequests.js` manages the active booking lifecycle. Key points:
- Auto-confirm logic runs **client-side**: when a booking's `auto_confirm_at` has passed and status is `in_progress`, the first participant to load the page triggers completion and invoice release.
- Platform fee is 15% + 5% tax, computed in `computeInvoice()`.
- Notifications are sent by calling `supabase.functions.invoke('booking-notify', …)` via `src/utils/sendNotification.js`.

### Edge Functions (Deno / TypeScript)

`supabase/functions/booking-notify/index.ts` — transactional email dispatcher. Uses the **service role key** to read across RLS. Dispatches emails via Resend for all booking lifecycle events. Add new email types here and in `sendNotification.js`.

`supabase/functions/send-email/index.ts` — Supabase Auth hook for signup/recovery/invite emails. Must be registered in Supabase Dashboard → Authentication → Hooks → Send Email.

### Styling

All styles are in `src/styles/index.css` (~3400 lines). No CSS modules, no utility framework. Add styles directly to this file; there is no per-component stylesheet.

### Mock / seed data

`src/data/buddies.js` and `src/data/fieldPosts.js` are static prototype fixtures (4 hosts, 8 Field posts across Lisbon/Porto/Barcelona/Berlin). Host availability dates are generated dynamically relative to today so the calendar always shows upcoming slots.

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
