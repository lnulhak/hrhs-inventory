# Account Migration Guide

This documents the steps to transfer the GitHub repository, Vercel project, and Supabase project from the personal developer account to an HRHS-owned account when the organisation is ready.

---

## 1. GitHub repository

### Option A — Transfer repository (recommended)

1. Create the HRHS GitHub organisation or personal account (e.g. `hrhs-sg`)
2. Go to **github.com/lnulhak/hrhs-inventory → Settings → Danger Zone → Transfer**
3. Enter the repo name to confirm, then enter the destination account/org
4. The repository URL changes to `github.com/hrhs-sg/hrhs-inventory`; the old URL redirects automatically for 12 months

### Option B — Fork and re-deploy

1. The new HRHS account forks `lnulhak/hrhs-inventory`
2. Vercel is re-linked to the forked repo (see section 2)
3. The original repo can be archived or deleted

**After transfer:** update the clone URL in README and in any local `.git/config` files.

---

## 2. Vercel project

1. The new HRHS account creates a Vercel account at vercel.com
2. **Import project** from the transferred GitHub repo
3. Re-add the two environment variables (Supabase URL + anon key) — these are not transferred automatically
4. Redeploy once to confirm the build succeeds
5. (Optional) Add a custom domain under **Settings → Domains**
6. Delete the project from the personal Vercel account once the new one is confirmed working

**Note:** the Vercel project currently lives under the personal account. Until migration, the personal account holder must manage deployments.

---

## 3. Supabase project

Supabase projects cannot be transferred between accounts directly. The migration requires an export/import:

### 3a. Export data from the current project

In the current Supabase dashboard:

```sql
-- Run in SQL Editor to get a CSV export of all items
COPY items TO STDOUT WITH CSV HEADER;
```

Or use **Table Editor → Export** to download as CSV.

### 3b. Create a new Supabase project under the HRHS account

1. Sign up / log in at supabase.com with the HRHS email
2. Create a new project (free tier)
3. Run `scripts/schema.sql` in the new project's SQL Editor
4. Import the CSV data:
   - Table Editor → items → Import data → upload the CSV
   - Or use the Supabase CLI: `supabase db push`

### 3c. Re-create the admin user

**Authentication → Users → Add user → Create new user**

Use the HRHS admin email and a new strong password.

### 3d. Update Vercel environment variables

In the new Vercel project (from section 2), update both env vars to point to the new Supabase project URL and anon key.

### 3e. Verify

Deploy and test the full flow: login, add item, clear stock, export CSV.

---

## Timeline recommendation

Do this migration before giving the URL to HRHS staff, so the organisation has full ownership from day one. The migration takes roughly 30–60 minutes.
