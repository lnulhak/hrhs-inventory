# HRHS Inventory Management System — Build Brief

This document is a complete handoff brief for building the HRHS Inventory Management System with Claude Code as a pair-programming assistant. It captures every relevant decision from the design phase so you can build without re-deriving them.

---

## 0. Pre-Flight Status (Already Done)

These are confirmed complete before this brief is read:

- ✅ **GitHub account** exists: `lnulhak`
- ✅ **Vercel account** created (personal email; to be migrated to HRHS-owned email per `docs/MIGRATION.md`)
- ✅ **Supabase account** created (personal email; same migration plan applies)
- ✅ **Node 20 LTS** installed via `nvm` (`node --version` → `v20.20.2`)
- ✅ **npm 10.x** available
- ✅ **git, VS Code** installed
- ✅ **OS:** Ubuntu 22.04 LTS
- ✅ **Working prototype** (`hrhs-inventory.jsx`) exists in the project root

**Skip account-creation steps in the implementation plan below.** Move directly into project scaffolding.

---

## 1. Context & Background

**HRHS = Hao Ren Hao Shi (好人好事)** — a Singapore-based community charity running food distribution out of a warehouse and community marts.

### The Problem
- HRHS receives food donations from corporates, individuals, and surplus near-expiry stock
- Food is distributed at community marts and events
- They currently have no inventory system — one part-timer keeps manual records, often unreachable
- Result: food waste because nobody can see what's expiring at which location
- Volunteers also can't tell what was returned from events and where it's stored

### The Goal
A shared inventory system where:
- Volunteers can log incoming/returning food with expiry, quantity, location
- All volunteers across all locations see a single shared view, sorted by what's expiring soonest
- Admins manage the inventory; non-admins (guests) get read-only access

### The Constraint
- ~30 users at scale
- Volunteers are mostly non-technical
- Mobile-first (volunteers use phones while handling boxes)
- Must take less than 30 seconds to log an item one-handed

---

## 2. Project Scope & Timeline

### Hard deadline: end of today (single-day compressed build)

This is a **compressed v0.9 build**. Two prototype features are deferred to keep the timeline realistic for a single day. The full prototype (`hrhs-inventory.jsx`) is preserved in the repo for reference and Reflection.

### V0.9 scope (must ship today)
1. Login screen with admin sign-in + guest view-only mode (per prototype)
2. Inventory list view: search, filter by location (including dynamic chips for custom locations), sort by expiry/recency/name
3. Log new item flow (Add form with inline + banner validation, required-field asterisks, red borders on missing fields)
4. Edit item flow (Edit modal with all fields editable)
5. Clear Stock action (remove entire batch, with confirmation)
6. Adjust Stock action (set remaining quantity for partial distribution, "how many left?" prompt)
7. Custom location support ("Other" button + free-text input, dynamic filter chips)
8. CSV export (admin only)
9. Persistent storage (Supabase Postgres in Singapore region)
10. Single hardcoded admin account (created via Supabase dashboard)
11. Deployment to Vercel with public URL
12. README, screenshots, and complete `docs/` per the assessment brief

### Cut from today's scope (to make 1-day feasible)
- **Photo upload** — remove from Add and Edit forms, remove thumbnail from cards, remove lightbox. Skip the `photo_url` column on the schema entirely. Note in README that real photo storage requires Supabase Storage setup (CORS, RLS on bucket, compression, EXIF stripping — non-trivial).
- **Demo video** — screenshots only. Video is optional in the brief, not required.

### Already deferred (originally part of v1, now v1.1)
- Forgot password / email reset (UI in prototype stays as reference, no backend wiring)
- Multi-admin creation/deactivation
- Audit log
- "Why was this cleared?" field
- Real-time sync (use refresh-on-load for v0.9)
- Mid-tier "volunteer" role

### Explicitly NOT in scope (ever)
- Native iOS/Android apps
- Offline mode
- Push notifications
- Multi-language

---

## 3. The Starting Point

### Prototype file
There is a fully working React UI prototype at `hrhs-inventory.jsx` in the project root (or wherever the user places it). **Read this file first.** It contains:
- The complete UI for all flows
- Login screen, main inventory view, Add modal, Edit modal, Lightbox
- HRHS branding (navy `#1a1f4f`, crimson `#a8233e`, Fraunces serif + DM Sans body)
- Tailwind CSS classes with custom CSS variables
- Sample data structure and component logic

**Your job is to:**
1. Migrate this single-file prototype into a real Next.js App Router project structure
2. Replace `useState`-based in-memory data with Supabase database calls
3. Wire up Supabase Auth for the admin login (using the existing login UI)
4. Add CSV export feature (already client-side logic in prototype, just port it)
5. Deploy to Vercel

The prototype is **the source of truth for UI and UX**. Do not redesign it. If something is unclear, ask before changing the visual behavior.

---

## 4. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 14+ (App Router) | Modern React, file-based routing, API routes built in |
| Language | JavaScript (no TypeScript) | Faster to write, lower learning curve for a 3-day timeline |
| Styling | Tailwind CSS | Already used in the prototype |
| UI primitives | None — custom components | Prototype uses plain Tailwind + lucide-react icons |
| Icons | `lucide-react` | Already imported in the prototype |
| Database | Supabase (Postgres) | Hosted Postgres + Auth + Storage in one platform |
| Auth | Supabase Auth (email + password) | Built-in, secure, no need to roll our own |
| Hosting | Vercel | Made by the Next.js team, free tier covers HRHS scale |
| Region | Supabase Singapore (`ap-southeast-1`) | Data locality + PDPA considerations |

### Things explicitly NOT to add
- No TypeScript (out of scope for this timeline)
- No state management library (React's `useState` and Supabase's hooks are enough)
- No CSS framework other than Tailwind
- No testing framework (out of scope for this timeline; document as future work)
- No Storybook
- No Docker / containerization

---

## 5. Database Schema

### Table: `items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `name` | `text` | Required |
| `brand` | `text` | Optional, nullable |
| `quantity` | `integer` | Required, ≥ 0 |
| `unit` | `text` | Required (free-form for v0.9: packs/cans/cartons/kg/loaves/cups/boxes/bottles) |
| `expiry` | `date` | Required |
| `location` | `text` | Required (free-form to support preset Location 1/2/3 + custom locations via "Other") |
| `logged_by` | `text` | Required (name string for v0.9; not yet linked to auth.users) |
| `notes` | `text` | Optional, nullable |
| `status` | `text` | Default `'available'`. Values: `'available'`, `'taken'` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`, trigger to auto-update on row change |

**Note:** `photo_url` column is intentionally omitted from v0.9. When Supabase Storage is wired in v1, add the column then.

### Row Level Security (RLS) policies

**Critical: enable RLS on the `items` table.** Then:

1. **Read access:**
   - `SELECT`: allow `anon` and `authenticated` roles. Guests must be able to view inventory.

2. **Write access (insert, update, delete):**
   - `INSERT`, `UPDATE`, `DELETE`: allow only `authenticated` role.
   - Use Supabase's built-in `auth.role()` function in policies.

### Indexes
- Index on `expiry` (ascending) — most common sort
- Index on `location` — common filter
- Index on `status` — most queries filter to `'available'`

### Sample seed data
Insert ~5 sample rows after creating the table so the app isn't empty on first load. Pick realistic items mirroring the prototype's sample data (Wholemeal Bread / Gardenia / 12 loaves / etc).

---

## 6. Auth Setup

### Single admin account
For v1, create **one admin user** via the Supabase dashboard:
1. Supabase project → Authentication → Users → Add user → "Send invitation" or "Create new user"
2. Email: `admin@hrhs-temp.com` (placeholder — to be changed when HRHS-owned email is set up)
3. Password: a strong password the user records securely

This account is the only admin in v1. The "create more admins" UI is deferred.

### Auth flow in the app
- The login screen UI from the prototype already exists — port it to a route at `/login` or treat the root `/` as login when unauthenticated.
- Use `@supabase/supabase-js` client library. Use the official Next.js Supabase helpers: `@supabase/ssr` (not the older `@supabase/auth-helpers-nextjs` which is deprecated as of 2024).
- "Sign in" button → `supabase.auth.signInWithPassword({ email, password })`
- "Continue as guest" button → set a local React state flag `isGuest = true`. No Supabase session needed for guests.
- After login, redirect to the main inventory view.
- "Sign out" / "Exit" button → `supabase.auth.signOut()` for admin, clear `isGuest` flag for guest.

### Session handling
- Use Supabase's built-in session management (stored in cookies via `@supabase/ssr`).
- Middleware (`middleware.js` at root) should refresh the session on every request.
- The main page should check session server-side and pass auth state to client components.

---

## 7. Project Structure (per brief)

Match the assessment brief's expected structure:

```
hrhs-inventory/
├── README.md
├── LICENSE                 (MIT license, simple)
├── .gitignore              (Next.js defaults + .env.local)
├── package.json
│
├── src/
│   ├── app/
│   │   ├── layout.js       (root layout: fonts, metadata)
│   │   ├── page.js         (main inventory page or login redirect)
│   │   ├── login/
│   │   │   └── page.js     (login screen — port from prototype)
│   │   └── api/            (server-side API routes if needed)
│   ├── components/
│   │   ├── InventoryList.js
│   │   ├── ItemCard.js
│   │   ├── AddItemModal.js
│   │   ├── EditItemModal.js
│   │   ├── Header.js
│   │   └── StatsStrip.js
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.js   (browser-side Supabase client)
│   │   │   └── server.js   (server-side Supabase client with cookie handling)
│   │   └── csvExport.js    (CSV generation utility, ported from prototype)
│   └── styles/
│       └── globals.css     (Tailwind directives + brand CSS vars)
│
├── docs/
│   ├── MIGRATION.md        (plan for migrating from personal to HRHS-owned accounts)
│   ├── DEPLOYMENT.md       (how to deploy and configure environment)
│   └── SCHEMA.md           (database schema reference)
│
├── scripts/
│   └── seed.sql            (SQL to seed sample data into Supabase)
│
├── assets/
│   └── screenshots/        (for README demo section)
│
└── hrhs-inventory.jsx      (original prototype, kept for reference and Reflection)
```

**Components NOT created in v0.9** (deferred per §2):
- `Lightbox.js` — photo upload removed entirely

### Files explicitly NOT to create
- `tests/` — out of scope, but reserve the folder with a `.gitkeep`. Document in README that tests are future work.
- `requirements.txt` — this is a Node project. The `package.json` covers it.
- `data/` — no datasets needed; sample data lives in `scripts/seed.sql`.

---

## 8. Environment Variables

Create `.env.local` in the project root (and **add to `.gitignore`** — never commit):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

These come from Supabase Dashboard → Project Settings → API. Use the **anon/public** key, NOT the service_role key.

Also document in `docs/DEPLOYMENT.md` that the same variables must be set in Vercel's project environment variables for production.

---

## 9. Implementation Order — Single-Day Compressed Plan

Estimated total active time: **8–12 hours**. Block uninterrupted time before starting.

Two hard checkpoints below. If the work isn't at the checkpoint, stop and diagnose before continuing — do not push through.

### Hour 0–3 — Scaffold + UI port + run locally

1. `cd ~/projects && mkdir -p hrhs-inventory && cd hrhs-inventory` (or wherever the user prefers — confirm with them)
2. Drop `CLAUDE_CODE_BRIEF.md` and `hrhs-inventory.jsx` into this directory
3. `npx create-next-app@latest .` (current directory) with these answers:
   - TypeScript: **No**
   - ESLint: **Yes**
   - Tailwind: **Yes**
   - `src/` directory: **Yes**
   - App Router: **Yes**
   - Turbopack: **No**
   - Custom import alias: **No**
4. Install runtime dependencies: `npm install lucide-react @supabase/supabase-js @supabase/ssr`
5. Port the prototype:
   - **Strategy: single big client component first.** Drop the entire `hrhs-inventory.jsx` into `src/app/page.js` as one big `'use client'` component. Do not split into smaller components yet — premature optimization for this timeline.
   - Apply the v0.9 scope cuts from §2: **remove photo upload field from the Add and Edit forms, remove photo thumbnails from cards, remove lightbox**. Everything else (Edit modal, custom location "Other", inline validation, all auth flows) stays as in the prototype.
   - Port the inline `<style>` block from the prototype into `src/app/globals.css` (preserve the `@import` for Fraunces/DM Sans and all `--hrhs-*` CSS variables).
6. `npm run dev` → confirm at `http://localhost:3000` that the UI matches the prototype's look (minus the cut features).

**🚦 CHECKPOINT 1 (end of Hour 3):** Static UI runs locally and looks correct. If not here, stop and diagnose.

### Hour 3–4 — Deploy static UI to Vercel

1. `git init && git add . && git commit -m "Initial scaffold with ported prototype UI"`
2. Create repo on GitHub: `lnulhak/hrhs-inventory` (public)
3. `git remote add origin git@github.com:lnulhak/hrhs-inventory.git && git push -u origin main` (or `https://` URL if SSH not set up)
4. In Vercel dashboard: **Add New → Project → Import** the GitHub repo. Accept defaults; no env vars needed yet for static UI.
5. Wait for deploy (~2 minutes). Verify the public URL works on the user's phone.

**🚦 CHECKPOINT 2 (end of Hour 4):** Public Vercel URL works on a phone. If not here, you will probably not finish today.

### Hour 4–8 — Supabase setup + auth + data wiring

1. **Supabase project:**
   - Create new project, region **`ap-southeast-1` (Singapore)**, strong DB password
   - Project Settings → API → copy URL and `anon` key
2. **Schema:**
   - SQL Editor → run schema from §5 to create `items` table with all columns + `updated_at` trigger
   - Enable Row Level Security on the table
   - Add two RLS policies: read for `anon, authenticated`; write for `authenticated` only
   - Create indexes on `expiry`, `location`, `status`
3. **Seed data:**
   - Run `scripts/seed.sql` (Claude Code should generate this) to insert 5 sample items
4. **Admin user:**
   - Authentication → Users → Add user → email `admin@hrhs-temp.com`, password (record securely)
   - Auto-confirm email (skip the verification step for v0.9 admin)
5. **Env vars locally:**
   - Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Verify `.env.local` is in `.gitignore`
6. **Env vars in Vercel:**
   - Project Settings → Environment Variables → add both keys for Production and Preview
7. **Wire up Supabase client:**
   - Create `src/lib/supabase/client.js` (browser client via `createBrowserClient` from `@supabase/ssr`)
   - Create `src/lib/supabase/server.js` (server client via `createServerClient` from `@supabase/ssr`)
   - Create `middleware.js` at project root for session refresh
8. **Replace in-memory state with Supabase calls:**
   - Initial load: `supabase.from('items').select('*').order('expiry', { ascending: true })`
   - Add: `supabase.from('items').insert({...})`
   - Edit: `supabase.from('items').update({...}).eq('id', ...)`
   - Clear Stock: `supabase.from('items').update({ status: 'taken' }).eq('id', ...)`
   - Adjust Stock: `supabase.from('items').update({ quantity: newQty }).eq('id', ...)`
9. **Wire login form** to `supabase.auth.signInWithPassword({ email, password })`. Use email format for username (e.g. `admin@hrhs-temp.com`).
10. **Wire "Continue as guest"** to a local React state flag (no Supabase session).
11. **Wire Sign out / Exit:** admin → `supabase.auth.signOut()`; guest → clear flag.
12. **Conditional rendering:** hide Add button + Clear/Adjust actions when user is not authenticated.
13. **Smoke test locally:** log in, add item, refresh — does it persist? Open private window, view as guest — does the data appear without edit buttons?
14. **Push to GitHub** → Vercel auto-deploys → verify on phone again.

### Hour 8–10 — CSV export + final smoke test

1. Port the `exportCSV` function from the prototype to `src/lib/csvExport.js`. It works client-side — fetch items from Supabase first, then run existing logic.
2. Wire the Export button on the search/sort row, admin-only.
3. **Full flow smoke test on phone:**
   - Login as admin → success
   - Log new item → appears in list, sorted correctly
   - Refresh → still there
   - Clear Stock → confirmation → removed
   - Adjust Stock → quantity updates
   - Export CSV → file downloads, opens cleanly in Sheets/Excel
   - Sign out → returns to login
   - Continue as guest → sees inventory, no edit buttons
   - Exit → returns to login

### Hour 10–12 — README, docs, screenshots, final polish

1. **Write `README.md`** per the structure in §10. Pull real quotes/decisions from the Claude design conversation for the "Development Approach with AI" section.
2. **Write `docs/MIGRATION.md`** — concrete steps to move GitHub, Vercel, Supabase from personal email to HRHS-owned email.
3. **Write `docs/DEPLOYMENT.md`** — env vars, Vercel setup, Supabase project setup.
4. **Write `docs/SCHEMA.md`** — table schema + RLS policy reference.
5. **Take 5–8 screenshots** of key flows: login, inventory list (admin view), Add modal, Clear Stock confirmation, Adjust Stock quantity input, guest view (with read-only banner), CSV file open in Sheets.
6. **Add `LICENSE`** (MIT — quick paste).
7. **Final commit + push** → Vercel auto-deploys → verify everything still works on phone.
8. **Verify the Definition of Done checklist in §12.** Anything unchecked = unaddressed gap.

### Time-saving rules during the build

- **Don't refactor.** First working state wins.
- **Don't add scope.** Cut more if you're behind, never add.
- **Commit at every working state**, even if the message is rough.
- **Take screenshots while you build**, not at the end — they're easier to capture when the UI is freshly loaded.
- **If stuck for 30+ minutes**, cut the feature and document it as deferred. Better to ship 80% working than 95% broken.

---

## 10. README Requirements

The README must follow this exact structure (per the assessment brief):

```markdown
# HRHS Inventory Management System

## Overview
### Problem
[2-3 sentences on HRHS's food waste problem, who's affected, why current process fails]

### Outcome
[Bulleted list: what was built, who it serves, what gets measured]

## Demo
[Step-by-step walkthrough with screenshots: open URL → login → add item → distribute → guest view]
[Embed/link demo video]

## Technology Stack
### Frontend components
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- lucide-react icons
- Fraunces + DM Sans (Google Fonts)

### Backend components
- Supabase Postgres (database)
- Supabase Auth (admin authentication)
- Vercel (hosting + serverless)

## Development Approach with AI
### AI tools used
- Claude (conversational design partner — UI/UX decisions, scope refinement, schema design, code review)
- Claude Code (pair programmer for implementation — file scaffolding, debugging, refactoring)

### Key prompts
[Document 4-6 actual prompts that shaped the project, in chronological order. Examples to include:]
- "No inventory management system at HRHS... how would you go about solving this?"
- "Can you create a quick prototype?"
- "Admins should also be required to upload pictures of the food" (and the pushback that led to making it optional)
- "Lets switch to Next.js + Supabase"

### Key review points and decisions
[Document the major design forks and what was chosen. Examples:]
- All-taken vs partial-taken → split into Clear Stock + Adjust Stock buttons
- Quantity prompt: "how many taken?" vs "how many left?" → chose "how many left?" (matches volunteer mental model when returning from events)
- Mandatory photos → made optional (friction outweighed benefit for non-technical volunteers)
- Casual button labels vs professional → chose "Clear Stock / Adjust Stock" over "All taken / Some taken"
- AppSheet vs Next.js → chose Next.js for stronger code artifact

## Installation
```bash
git clone https://github.com/lnulhak/hrhs-inventory.git
cd hrhs-inventory
npm install
cp .env.local.example .env.local
# Fill in Supabase URL and anon key in .env.local
npm run dev
# Open http://localhost:3000
```

## Usage
[Admin login: email and password from .env or first-run setup]
[Guest access: click "Continue as guest" on login screen]
[Logging an item: click "Log food" → fill form → save]
[Distributing: tap item → Clear Stock or Adjust Stock]

## Project Structure
[Map of folders with one-line description per folder, per the structure in §7]

## Reflection
### What worked
- Iterative prototyping in Claude before committing to a stack
- AI-driven pushback on design decisions (e.g. mandatory photos)
- Choosing simplicity over feature count
- Compressing scope when timeline got real

### What failed / changed
- Initial plan was AppSheet — switched to Next.js once assessment brief was reviewed
- Mandatory photo upload was specified, reverted to optional after AI pushback
- "All taken" / "Some taken" labels were too casual, switched to Clear Stock / Adjust Stock
- Original 3-day plan compressed to 1 day, with explicit feature cuts to make it feasible

### What was deferred (v0.9 cuts)
- Photo upload (requires Supabase Storage setup, RLS on buckets, CORS, compression, EXIF stripping — non-trivial)
- Demo video (screenshots provided instead)

### What was deferred (originally v1, now v1.1)
- Forgot password / email reset flow (UI built in prototype, backend deferred)
- Multi-admin management
- Audit log
- Real photo storage (Supabase Storage integration)
- "Why was this cleared?" tracking field (distributed / expired / discarded / transferred)
- Mid-tier "volunteer" role

### What I'd do differently
- Build smaller, validate with real volunteers earlier
- Treat AI pushback as a feature: forcing me to justify design choices led to a better product
- Scope cuts feel painful at the time but the shipped product is what matters
```

---

## 11. Working With Claude Code: Practical Notes

### How to use this brief
1. Place this file (`CLAUDE_CODE_BRIEF.md`) in the project root
2. Place the prototype file (`hrhs-inventory.jsx`) in the project root
3. Start your Claude Code session in the project directory
4. First message: "Read CLAUDE_CODE_BRIEF.md and hrhs-inventory.jsx. Then we'll start Phase 1."

### Effective working style
- **Work one phase at a time.** Don't ask Claude Code to do everything at once.
- **Verify after each phase.** Run the app locally and confirm it works before moving on.
- **Commit often.** After every working state, `git commit -m "..."` with a clear message.
- **Read errors carefully** before pasting them to Claude. Often the error message *is* the answer.

### When something breaks
1. Read the actual error message
2. Try to identify whether it's a config issue, a code bug, or an environment issue
3. If stuck, paste:
   - The exact error
   - The command you ran
   - The relevant file content
4. Don't paste your entire codebase — that hides the signal

### Honest expectations
- Day 1 may feel slow if you've never used Next.js before. That's normal.
- Auth/RLS will probably break in unexpected ways once. Budget half a day.
- Vercel + Supabase env vars are a common source of "works locally, broken in production" bugs.

### What Claude Code is good at
- File scaffolding, boilerplate
- Debugging stack traces and error messages
- Refactoring across multiple files
- Writing SQL schema and RLS policies
- Documentation drafts

### What Claude Code is not as good at
- Knowing which version of Supabase libraries is current — verify with their docs
- Knowing your local environment quirks
- Telling you when to stop adding features (that's your job)

---

## 12. Definition of Done (v0.9, end of today)

The project is **done** when ALL of these are true:

- [ ] Public Vercel URL works and the login screen loads on a phone
- [ ] Admin login works with the seeded admin account
- [ ] Guest mode works and Add/Edit/Clear/Adjust buttons are correctly hidden
- [ ] Can log a new item (Add modal); it persists across page refresh
- [ ] Can edit an item (Edit modal); changes persist
- [ ] Can Clear Stock; item disappears from list
- [ ] Can Adjust Stock; quantity updates correctly and persists
- [ ] Custom location ("Other" → free-text) works; chip appears in filter row
- [ ] Inline validation works on the Add form (red borders + per-field messages + top banner)
- [ ] CSV export downloads a real file with all items
- [ ] Two browsers can see each other's changes (after manual refresh — real-time sync is deferred)
- [ ] README is complete per §10
- [ ] `docs/MIGRATION.md`, `docs/DEPLOYMENT.md`, `docs/SCHEMA.md` all written
- [ ] All deferred features documented in README "Reflection" section
- [ ] Repository is public on GitHub at `lnulhak/hrhs-inventory`
- [ ] LICENSE file (MIT) is in repo root
- [ ] 5+ screenshots captured and linked in README

**Items NOT required for Done (deferred per §2):**
- Photo upload (form field, thumbnails on cards, lightbox)
- Demo video

If a required item is blocked, stop and address it before adding anything else. If a blocked required item cannot be resolved in time, **cut it and add it to the deferred list with honest documentation** rather than shipping broken.

---

## 13. Brand & Style Reference

### Colors (already in the prototype, do not change)
- Primary navy: `#1a1f4f` (dark backgrounds, primary buttons, titles)
- Navy dark (hover): `#131739`
- Crimson accent: `#a8233e` (destructive actions, accents)
- Crimson dark (hover): `#871a31`
- Functional colors: emerald-700 (Clear Stock success), amber-500 (Adjust Stock warning)
- Stone palette: neutrals throughout

### Typography
- Display headings: **Fraunces** (serif), weights 400-700
- Body text: **DM Sans** (sans-serif), weights 400-700

### Brand block
Always rendered as: `好人好事 · Hao Ren Hao Shi` (Chinese characters + middot + romanization)

---

End of brief.
