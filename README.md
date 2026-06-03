# SharedXP

> **Global C2C/B2C sport experience sharing platform.**  
> Find locals who share your sport at the places you travel — and do what you love without carrying any equipment.

-----

## The Idea

*“Every time I travel, I have to stop doing some of the things I do regularly back home. So I thought of this idea to engage locals to help travelers with their sport expertise, equipment and guidance. In return, hosts can make money for their service and travelers are more than happy to pay for it. It’s a win-win for all.”*

— **Alp R. Capa**, Founder & CEO

SharedXP connects sports-loving travelers with local people who are eager to share their experience and equipment. Whether you cycle, run, play tennis, surf, or shoot hoops — find a local buddy at your destination and stay active, even without your gear.

-----


## Features

### For Travelers

- **Browse locals** — search by sport, city, level, gender, and equipment availability
- **Interactive map** — see nearby hosts plotted with distance sorting
- **Host profiles** — gallery, availability calendar, 6-dimension reviews, and pricing
- **Book a session** — pick a date and time, request a booking in a few taps
- **XP History** — view completed experiences, upload photos, leave reviews
- **Share to The Field** — post your session photos and caption to the community feed
- **Payment History** — full invoice log with per-transaction XP earned
- **XP Loyalty Program** — earn XP on every booking via Normalized Spending Units (NSU)

### For Hosts

- **Host onboarding** — list one or more sports with availability, pricing, and equipment details
- **Host settings** — pause hosting, update profile, manage payout info
- **Host history** — view completed sessions and participants; earn equal XP as guests

### The Field

- Community experience feed sourced from real completed sessions
- Photo carousel on multi-image posts
- Filter by city and sport
- Share your own experience directly from History
- View host profiles from community posts
- Remove your own posts at any time

### Events

- Browse major international sports events (marathons, cycling races, tennis, F1, etc.)
- Events synced daily via the `events-sync` edge function
- Filter and discover events relevant to your sport interests

### Platform

- Sign up with email or social (Google / Apple — prototype)
- Email confirmation and password reset via Resend
- Hosting paused indicator in nav
- Admin dispute dashboard for customer service
- Inbound support inbox — emails to support@sharedxp.com are stored and auto-replied
- Community Manager program — applications, referral codes, and per-booking commissions
- Full legal pages suite (Terms, Privacy, Payments, Safety, IP, Disclaimers, Cancellation Policy, CM Policy)

-----

## Tech Stack

|Layer     |Technology                     |
|----------|-------------------------------|
|Framework |React 18                       |
|Routing   |React Router v6                |
|Bundler   |Vite 5                         |
|Styling   |Custom CSS (no UI library)     |
|Backend   |Supabase (Postgres + Auth + Storage)|
|Auth      |Supabase Auth (email + OAuth, implicit flow)|
|Email     |Resend via Supabase Edge Functions (Deno)|
|Geocoding |Nominatim / OpenStreetMap      |
|Deployment|Vercel                         |

No external UI libraries. No TypeScript (frontend). The only runtime dependency beyond React and React Router is `@supabase/supabase-js`.

-----

## Project Status

The core platform is live and backed by Supabase. Auth (including password reset), profiles, host onboarding, booking requests, in-app chat, invoicing, disputes, transactional email, The Field community feed, XP loyalty program, payment history, the Events page, Community Manager applications and commissions, and an inbound support email inbox are all functional.

### Still to come

- Stripe Connect for host payouts (invoices are currently simulated)
- Full OAuth via Google & Apple (wired up but prototype-only)
- Moderation for The Field
- CM Dashboard UI (page exists but is not yet routed)

-----

## Getting Started

```bash
# Clone the repo
git clone https://github.com/alpcapa/SharedXP.git
cd SharedXP

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project

# Start the dev server
npm run dev
```

Open <http://localhost:5173> in your browser.

### Build for production

```bash
npm run build
npm run preview
```

-----

## Live Demo

👉 [project-gq4ge.vercel.app](https://project-gq4ge.vercel.app)

Sign up with any email and password to explore the full prototype. To test the host flow, sign up and go to **Become a Host** in the nav.

-----

## Folder Structure

```
src/
├── assets/              # Static images and SVGs
├── components/          # Shared UI (SiteHeader, SiteFooter, BuddyCard)
├── context/             # AuthContext — all auth state and user mutations
├── data/                # Static reference data (sports, countries, events)
├── hooks/               # useBookingRequests, useHosts
├── lib/                 # supabase.js — singleton Supabase client
├── pages/               # One file per route
├── styles/              # index.css — global styles (~6,500 lines, no modules)
├── utils/               # Date, age, pricing, and notification helpers
├── App.jsx              # Route declarations
└── main.jsx             # Entry point
supabase/
├── functions/
│   ├── booking-notify/  # Transactional email dispatcher (Deno)
│   ├── send-email/      # Supabase Auth email hook (Deno)
│   ├── forgot-password/ # Password reset email sender (Deno)
│   ├── events-sync/     # Daily sports events sync (Deno)
│   └── inbound-support/ # Inbound support email receiver (Deno)
└── migrations/          # Numbered SQL migrations (001–038; 034 absent)
```

-----

## Routes

|Path                              |Page                                                   |
|----------------------------------|-------------------------------------------------------|
|`/`                               |Home — hero, featured locals, sport chips, how it works|
|`/locals`                         |Explore — map + filtered list of hosts                 |
|`/the-field`                      |Community experience feed                              |
|`/events`                         |Major international sports events                      |
|`/about`                          |About, story, how it works, values, CTA                |
|`/signup`                         |Sign up                                                |
|`/login`                          |Log in                                                 |
|`/auth/confirm`                   |Email confirmation handler                             |
|`/reset-password`                 |Password reset form                                    |
|`/edit-profile`                   |Edit personal profile                                  |
|`/user/:userId`                   |Profile page (own or another user's)                   |
|`/become-a-host`                  |Host onboarding                                        |
|`/host-settings`                  |Manage host profile                                    |
|`/history`                        |XP History — booking history, photo upload, reviews, share to Field|
|`/payment-history`                |Payment History — invoice log with XP earned per transaction       |
|`/loyalty-program`                |XP Loyalty Program — rules, NSU rates, program terms               |
|`/payment/:bookingRequestId`      |Payment page for an accepted booking                               |
|`/chat/:bookingRequestId`         |In-app messaging for a booking                         |
|`/dispute-response/:disputeId`    |Host dispute response form                             |
|`/admin`                          |Admin panel — disputes, CM, support (requires `is_admin = true`)|
|`/follow`                         |Follow / connections                                   |
|`/help`                           |Help centre                                            |
|`/legal`                          |Legal hub — links to all legal pages                   |
|`/terms-and-conditions`           |Terms and Conditions                                   |
|`/privacy-notice`                 |Privacy Notice                                         |
|`/payments-and-payout-terms`      |Payments and Payout Terms                              |
|`/safety-and-risk-policy`         |Safety and Risk Policy                                 |
|`/content-and-intellectual-property-policy`|Content and IP Policy                         |
|`/disclaimers`                    |Disclaimers                                            |
|`/cancellation-policy`            |Cancellation Policy                                    |
|`/community-manager-policy`       |Community Manager Policy                               |
|`/how-it-works`                   |→ redirects to `/about`                                |
|`/host-history`                   |→ redirects to `/history`                              |
|`/buddy/:buddyId`                 |→ redirects to `/user/:buddyId`                        |
|`*`                               |404 Not Found                                          |

-----

## Photo Upload Notes

Photos uploaded in the History page are stored in the Supabase `host-sport-images` storage bucket. A limit of **5 photos per session** is enforced client-side. User avatars are stored in the `Avatars` bucket. Both buckets serve public URLs.

-----

## License

Private. All rights reserved © SharedXP.
