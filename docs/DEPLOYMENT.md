# Deployment Guide

## Prerequisites

- Node.js 20 LTS
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- A [Vercel](https://vercel.com) account connected to GitHub

---

## 1. Supabase setup

### 1a. Create the table

Go to **Supabase Dashboard → SQL Editor → New query**, paste the contents of `scripts/schema.sql`, and click **Run**.

This creates the `items` table, the `updated_at` trigger, RLS policies, and indexes.

### 1b. Seed sample data (optional)

Same SQL Editor → New query → paste `scripts/seed.sql` → Run.

This inserts 5 sample items so the inventory isn't empty on first login.

### 1c. Create the admin user

**Authentication → Users → Add user → Create new user**

- Email: `admin@abc-temp.com` (or any email you choose)
- Password: strong password — save it
- Check **"Auto Confirm User"**

This is the only account that can log in for v0.9. Guest access requires no account.

### 1d. Get your API credentials

**Project Settings → API**

Copy:
- **Project URL** — looks like `https://xxxxxxxxxxx.supabase.co`
- **anon public** key — the long `sb_publishable_...` string (not the service_role key)

---

## 2. Environment variables

Create `.env.local` in the project root (copy from `.env.sample`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

DEMO_USER=demo
DEMO_PASS=your_chosen_password
```

- `NEXT_PUBLIC_*` vars are inlined at build time and visible in client-side code. The anon key is safe to expose — it's restricted by RLS policies on the Supabase side.
- `DEMO_USER` and `DEMO_PASS` are the credentials for the Basic Auth gate (`middleware.js`). The browser will prompt for these on first visit.

**Never commit `.env.local` to git.** It is in `.gitignore`.

---

## 3. Local development

```bash
git clone https://github.com/lnulhak/hrhs-inventory.git
cd hrhs-inventory
npm install
cp .env.sample .env.local
# Edit .env.local with your Supabase credentials and chosen DEMO_USER/DEMO_PASS
npm run dev
# Open http://localhost:3000
```

---

## 4. Vercel deployment

### 4a. Import the repo

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import `lnulhak/hrhs-inventory` from GitHub
3. Framework preset will auto-detect as **Next.js** — accept defaults
4. **Do not deploy yet** — add env vars first (step 4b)

### 4b. Add environment variables

**Vercel → project → Settings → Environment Variables**

Add all four variables, ticking **Production**, **Preview**, and **Development**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` |
| `DEMO_USER` | `demo` |
| `DEMO_PASS` | `your_chosen_password` |

Save each variable before adding the next.

**Note:** if you change `DEMO_USER` or `DEMO_PASS` after deployment, you must redeploy for the new values to take effect.

### 4c. Deploy

Click **Deploy** (or push a commit to `main` — Vercel deploys automatically on every push).

**Important:** `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at build time. If you add or change them in Vercel after a build has already run, you must trigger a fresh deployment (Deployments → three dots → Redeploy) for the new values to take effect.

---

## 5. Verify production

After deployment:

1. Open the Vercel URL on your phone
2. Sign in with the admin email + password from step 1c
3. Confirm items load from Supabase
4. Log a new item → refresh → verify it persists
5. Open a second browser tab as guest → verify read-only access
