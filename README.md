# SharedXP

> **Global C2C/B2C sport experience sharing platform.**  
> Find locals who share your sport at the places you travel — and do what you love without carrying any equipment.

-----

## The Idea

*“Every time I travel, I have to stop doing some of the things I do regularly back home. So I thought of this idea to engage locals to help travelers with their sport expertise, equipment and guidance. In return, hosts can make money for their service and travelers are more than happy to pay for it. It’s a win-win for all.”*

— **Alp R. Capa**, Founder & CEO

SharedXP connects sports-loving travelers with local people who are eager to share their experience and equipment. Whether you cycle, run, play tennis, surf, or shoot hoops — find a local buddy at your destination and stay active, even without your gear.

-----

## Screenshots

|Home                                                      |Explore                                                         |Profile                                                         |
|----------------------------------------------------------|----------------------------------------------------------------|----------------------------------------------------------------|
|![Home](docs/screenshots/home-hero-background-visible.png)|![Explore](docs/screenshots/explore-page-no-hero-background.png)|![Profile](docs/screenshots/my-profile-language-host-sports.png)|

|Sign Up                                                 |History                                              |
|--------------------------------------------------------|-----------------------------------------------------|
|![Sign Up](docs/screenshots/signup-language-section.png)|![History](docs/screenshots/history-page-revised.png)|

-----

## Features

### For Travelers

- **Browse locals** — search by sport, city, level, gender, and equipment availability
- **Interactive map** — see nearby hosts plotted with distance sorting
- **Host profiles** — gallery, availability calendar, 6-dimension reviews, and pricing
- **Book a session** — pick a date and time, request a booking in a few taps
- **Session history** — view completed experiences, upload photos, leave reviews
- **Share to The Field** — post your session photos and caption to the community feed

### For Hosts

- **Host onboarding** — list one or more sports with availability, pricing, and equipment details
- **Host settings** — pause hosting, update profile, manage payout info
- **Host history** — view completed sessions and participants

### The Field

- Community experience feed sourced from real completed sessions
- Photo carousel on multi-image posts
- Filter by city and sport
- Share your own experience directly from History
- View host profiles from community posts
- Remove your own posts at any time

### Platform

- Sign up with email or social (Google / Apple — prototype)
- Email confirmation and password reset via Resend
- Hosting paused indicator in nav
- Admin dispute dashboard for customer service

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
|Deployment|Vercel                         |

No external UI libraries. No TypeScript (frontend). The only runtime dependency beyond React and React Router is `@supabase/supabase-js`.

-----

## Project Status

The core platform is live and backed by Supabase. Auth, profiles, host onboarding, booking requests, in-app chat, invoicing, disputes, and transactional email are all functional.

### Still to come

- Stripe Connect for host payouts (invoices are currently simulated)
- Full OAuth via Google & Apple (wired up but prototype-only)
- Moderation for The Field

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
├── data/                # Prototype seed data (buddies, field posts)
├── hooks/               # useBookingRequests — booking lifecycle logic
├── lib/                 # supabase.js — singleton Supabase client
├── pages/               # One file per route
├── styles/              # index.css — global styles (~3,400 lines, no modules)
├── utils/               # Date, age, and notification helpers
├── App.jsx              # Route declarations
└── main.jsx             # Entry point
supabase/
├── functions/
│   ├── booking-notify/  # Transactional email dispatcher (Deno)
│   └── send-email/      # Supabase Auth email hook (Deno)
└── migrations/          # Numbered SQL migrations (001–012)
```

-----

## Routes

|Path                              |Page                                                   |
|----------------------------------|-------------------------------------------------------|
|`/`                               |Home — hero, featured locals, sport chips, how it works|
|`/locals`                         |Explore — map + filtered list of hosts                 |
|`/buddy/:buddyId`                 |Host profile — gallery, calendar, booking, reviews     |
|`/the-field`                      |Community experience feed                              |
|`/about`                          |About, story, how it works, values, CTA                |
|`/signup`                         |Sign up                                                |
|`/login`                          |Log in                                                 |
|`/my-profile`                     |Edit personal profile                                  |
|`/user-profile`                   |Logged-in user's public profile view                   |
|`/user/:userId`                   |Another user's public profile                          |
|`/become-a-host`                  |Host onboarding                                        |
|`/host-settings`                  |Manage host profile                                    |
|`/history`                        |Booking history, photo upload, reviews, share to Field |
|`/payment/:bookingRequestId`      |Payment page for an accepted booking                   |
|`/chat/:bookingRequestId`         |In-app messaging for a booking                         |
|`/dispute-response/:disputeId`    |Host dispute response form                             |
|`/admin/disputes`                 |Admin dispute dashboard (requires `is_admin = true`)   |
|`/follow`                         |Follow / connections                                   |
|`/help`                           |Help centre                                            |
|`/how-it-works`                   |→ redirects to `/about`                                |
|`/host-history`                   |→ redirects to `/history`                              |

-----

## Mock Data

The prototype ships with 4 host buddies and 8 Field posts covering:

**Hosts:** Cycling · Tennis · Running · Basketball  
**Cities:** Lisbon · Porto · Barcelona · Berlin

Host availability dates are generated dynamically relative to today so the booking calendar always shows upcoming slots.

-----

## Photo Upload Notes

Photos uploaded in the History page are stored in the Supabase `host-sport-images` storage bucket. A limit of **5 photos per session** is enforced client-side. User avatars are stored in the `Avatars` bucket. Both buckets serve public URLs.

-----

## License

Private. All rights reserved © SharedXP.
