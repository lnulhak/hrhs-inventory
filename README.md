# HRHS Inventory Management System

## Overview

### Problem

Hao Ren Hao Shi (好人好事) is a Singapore-based community charity running food distribution out of a warehouse and community marts. Food donations arrive from corporates, individuals, and surplus near-expiry stock — but with no shared inventory system, one part-timer kept manual records that were often inaccessible to volunteers. The result was food waste: nobody could see what was expiring at which location, and volunteers couldn't tell what was returned from events and where it was stored.

### Outcome

- A shared, mobile-first inventory system where volunteers log incoming and returning food with expiry date, quantity, and location
- All volunteers across all locations see a single shared view sorted by soonest expiry
- Admins manage the inventory (add, edit, clear, adjust); guests get read-only access
- Deployed publicly at **https://hrhs-inventory.vercel.app/**

---

## Demo

**Live URL:** https://hrhs-inventory.vercel.app/

### Walkthrough

**1. Login screen**

Open the URL. You'll see the HRHS login screen with admin sign-in and a "Continue as guest" link.

![Login screen](public/screenshots/01-login.png)

**2. Inventory list (admin view)**

Sign in as admin. Items are sorted by soonest expiry by default. Use the search bar, location chips, or sort dropdown to filter.

![Inventory list — admin](public/screenshots/02-inventory-admin.png)

**3. Log a new item**

Click **Log food**. Fill in name, quantity, unit, expiry date, and location. Required fields show red borders and per-field messages if left blank. Click **Save**.

![Add item modal](public/screenshots/03-add-item.png)

**4. Distribute stock**

Tap an item to reveal actions:
- **Clear Stock** — marks the entire batch as taken (with confirmation prompt)
- **Adjust Stock** — enter how many units remain after partial distribution

![Clear Stock confirmation](public/screenshots/04-clear-stock.png)
![Adjust Stock quantity input](public/screenshots/05-adjust-stock.png)

**5. Guest view**

Click **Sign out**, then **Continue as guest**. The inventory is visible but Log food / Edit / Clear / Adjust buttons are hidden.

![Guest view — read only](public/screenshots/06-guest-view.png)

**6. CSV export**

Admins see an **Export CSV** button. The downloaded file opens in Excel or Google Sheets with all fields.

![CSV in Google Sheets](public/screenshots/07-csv-export.png)

---

## Technology Stack

### Frontend
- **Next.js 15** (App Router, client components)
- **React 18**
- **Tailwind CSS v4**
- **lucide-react** icons
- **Fraunces + DM Sans** (Google Fonts)

### Backend
- **Supabase Postgres** — persistent item storage
- **Supabase Auth** — admin authentication (email + password)
- **Row Level Security** — guests read via anon key; writes require authenticated session
- **Vercel** — hosting, CI/CD from GitHub

---

## Development Approach with AI

### AI tools used

- **Claude** (conversational design partner) — UI/UX decisions, scope refinement, schema design, accessibility review
- **Claude Code** (pair programmer) — file scaffolding, debugging, refactoring, deployment troubleshooting

### Key prompts

1. *"No inventory management system at HRHS... how would you go about solving this?"* — opened the problem space and surfaced the expiry-sorting requirement as the core UX priority
2. *"Can you create a quick prototype?"* — produced `hrhs-inventory.jsx`, the single-file React prototype that defined the entire UI before any framework was chosen
3. *"Admins should also be required to upload pictures of the food"* — led to pushback: mandatory photo upload adds friction for non-technical volunteers on phones; made optional, then deferred entirely for v0.9
4. *"Let's switch to Next.js + Supabase"* — stack decision made after reviewing the assessment brief; AppSheet was the original candidate but Next.js produces a stronger code artifact
5. *"What's the trade-off of client-side auth vs middleware?"* — led to removing the Edge Runtime middleware that was crashing on Vercel and confirming client-side session management is sufficient for this scale

### Key design decisions

| Decision | Options considered | Chosen | Reason |
|---|---|---|---|
| Stock action UX | Single "Mark as taken" | Clear Stock + Adjust Stock | Volunteers returning partial stock from events need to record what's left, not what was taken |
| Quantity prompt | "How many taken?" | "How many left?" | Matches volunteer mental model when counting remaining boxes |
| Photo upload | Mandatory → Optional → Deferred | Deferred to v1.1 | Adds friction; requires Supabase Storage, CORS, RLS on buckets, compression, EXIF stripping |
| Button labels | "All taken / Some taken" | "Clear Stock / Adjust Stock" | More professional; clearer action semantics |
| App framework | AppSheet | Next.js + Supabase | Produces a stronger, auditable code artifact |

---

## Installation

```bash
git clone https://github.com/lnulhak/hrhs-inventory.git
cd hrhs-inventory
npm install
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key in .env.local
npm run dev
# Open http://localhost:3000
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Supabase schema setup and Vercel deployment.

---

## Usage

**Admin login:** `admin@hrhs-temp.com` + password set during Supabase user creation  
**Guest access:** click "Continue as guest" on the login screen — read-only, no account needed  
**Log an item:** click **Log food** → fill in all required fields → **Save**  
**Distribute:** tap an item card → **Clear Stock** (whole batch gone) or **Adjust Stock** (enter how many remain)  
**Export:** admin only — click **Export CSV** for a spreadsheet of all current inventory  

---

## Project Structure

```
hrhs-inventory/
├── src/
│   ├── app/
│   │   ├── page.js          # Main inventory app (single-page client component)
│   │   ├── layout.js        # Root layout with Google Fonts and metadata
│   │   └── globals.css      # Tailwind v4 config and HRHS brand classes
│   └── lib/
│       └── supabase/
│           ├── client.js    # Browser-side Supabase client
│           └── server.js    # Server-side Supabase client (reserved for future SSR)
├── scripts/
│   ├── schema.sql           # Supabase table definition and RLS policies
│   └── seed.sql             # Sample data for local/staging setup
├── docs/
│   ├── DEPLOYMENT.md        # Env vars, Vercel setup, Supabase project setup
│   ├── MIGRATION.md         # Steps to move accounts from personal to HRHS email
│   └── SCHEMA.md            # Table schema and RLS policy reference
├── public/
│   └── screenshots/         # UI screenshots for README
├── tests/                   # Reserved — tests are future work (see Reflection)
├── hrhs-inventory.jsx       # Original single-file React prototype (preserved for reference)
└── CLAUDE_CODE_BRIEF.md     # Project brief used with Claude Code
```

---

## Reflection

### What worked

- **Iterative prototyping before committing to a stack** — building `hrhs-inventory.jsx` first meant all UX decisions were resolved before touching Next.js
- **AI-driven pushback on design decisions** — mandatory photo upload was specified, Claude pushed back on the friction, and the feature was correctly deprioritised
- **Explicit scope cuts** — writing down what was deferred and why kept the timeline realistic

### What failed / changed

- **Original stack was AppSheet** — switched to Next.js once the assessment brief was reviewed and a code artifact was clearly required
- **Mandatory photo upload was in the brief** — reverted to optional, then deferred entirely; requires Supabase Storage, bucket RLS, CORS config, and image compression that would have consumed half the build day
- **Edge Runtime middleware** — added for auth protection, then removed when it caused `MIDDLEWARE_INVOCATION_FAILED` on Vercel; client-side session management is sufficient for this scale
- **`NEXT_PUBLIC_*` env vars not baked into build** — Vercel builds at push time; vars must be set in the Vercel dashboard *before* the build runs, not after

### What was deferred (v0.9 cuts)

- **Photo upload** — requires Supabase Storage bucket, CORS policy, RLS on the bucket, client-side compression before upload, and EXIF stripping for privacy. Non-trivial and high-friction for non-technical volunteers on phones. Targeted for v1.1.
- **Demo video** — screenshots provided instead; video is optional in the brief
- **Forgot password / email reset** — UI exists in the prototype; backend wiring deferred to v1.1
- **Multi-admin management** — single hardcoded admin for v0.9; v1.1 adds admin creation/deactivation UI
- **Audit log** — no record of who cleared or adjusted which item; deferred to v1.1
- **Real-time sync** — inventory refreshes on page load; live push updates deferred to v1.1

---

## License

MIT — see [LICENSE](LICENSE)
