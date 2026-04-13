# People Operations Platform — Deployment Guide

## What you need before starting

- GitHub account
- Vercel account (free tier works)
- Railway account (free trial or Starter plan)
- Supabase project already running (Phase 1 done)
- Anthropic API key from console.anthropic.com

---

## Step 1 — Push to GitHub (run on your machine)

```bash
cd "People Operations Platform"

# Init repo
git init
git branch -m main

# Set your identity (first time only)
git config user.name  "Your Name"
git config user.email "you@example.com"

# Stage and commit everything
git add .
git commit -m "feat: initial People Ops Platform (Phase 1–3 complete)"

# Create a new repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/people-ops-platform.git
git push -u origin main
```

---

## Step 2 — Deploy Backend on Railway

| Step | Action |
|------|--------|
| 1 | Go to railway.app → New Project → Deploy from GitHub repo |
| 2 | Select your `people-ops-platform` repo |
| 3 | Railway auto-detects the `Procfile` in `/backend` — set **Root Directory** to `backend` |
| 4 | Add all environment variables (see table below) |
| 5 | Click **Deploy** — Railway runs `pip install -r requirements.txt` then starts uvicorn |
| 6 | Copy the generated Railway URL (e.g. `https://people-ops-production.up.railway.app`) |
| 7 | Confirm health check: visit `YOUR_RAILWAY_URL/health` — should return `{"status":"ok"}` |

### Backend environment variables (Railway → Variables tab)

| Variable | Where to find it |
|----------|-----------------|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → service_role secret key |
| `SUPABASE_JWT_SECRET` | Supabase dashboard → Project Settings → API → JWT Secret |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` (fill in after Step 3) |

---

## Step 3 — Deploy Frontend on Vercel

| Step | Action |
|------|--------|
| 1 | Go to vercel.com → New Project → Import from GitHub |
| 2 | Select your repo → set **Root Directory** to `frontend` |
| 3 | Framework preset: **Vite** (auto-detected) |
| 4 | Add environment variable: `VITE_API_BASE_URL` = `https://YOUR_RAILWAY_URL/api/v1` |
| 5 | Click **Deploy** |
| 6 | Copy your Vercel URL (e.g. `https://people-ops.vercel.app`) |
| 7 | Go back to Railway → update `CORS_ORIGINS` with this Vercel URL → redeploy backend |

> **vercel.json** is already configured — all routes fall back to `index.html` so React Router works correctly.

---

## Step 4 — Supabase: Enable Cron for Acting MD Auto-Expiry

The `expire_acting_md()` function is already in the database. Wire it to run daily:

1. In Supabase dashboard → **Database** → **Extensions** → enable `pg_cron`
2. Run this SQL in the SQL Editor:

```sql
SELECT cron.schedule(
  'expire-acting-md-daily',
  '0 0 * * *',          -- runs at midnight UTC every day
  $$ SELECT expire_acting_md(); $$
);
```

---

## Step 5 — Create your first MD user

Supabase does not auto-create employee records. After deployment, do this once:

1. In Supabase → **Authentication** → **Users** → **Add User** — create your email/password
2. Copy the new user's UUID
3. In Supabase → **SQL Editor**, run:

```sql
INSERT INTO employees (auth_user_id, name, email, role, department, position)
VALUES (
  'PASTE-YOUR-UUID-HERE',
  'Your Name',
  'you@company.com',
  'md',
  'Management',
  'Managing Director'
);
```

4. Log in at your Vercel URL — you'll be redirected to the MD dashboard.

---

## Step 6 — Add employees via Supabase Auth

For each employee/manager:
1. Create user in Supabase Auth (or use **Invite by email** so they set their own password)
2. Insert a row into `employees` with the correct `role` (`employee` or `manager`) and their `auth_user_id`

---

## Post-deployment checklist

- [ ] `GET /health` returns `{"status":"ok"}` on Railway URL
- [ ] Login works at Vercel URL
- [ ] MD dashboard loads (All Requests, Grievances, Disciplinary, Acting MD, Suggestions Review)
- [ ] Employee can submit a request and see it in My Requests
- [ ] Manager sees pending approvals with Decision Guide panel
- [ ] AI chat responds (test with "how many days leave do I have?")
- [ ] Grievance submission auto-assigns to MD (no manager visibility)
- [ ] Rejection requires a reason (try rejecting without one — should block)
- [ ] Acting MD assignment works and force-expire works
- [ ] Monthly Suggestions Review shows Top 3 preview

---

## Architecture summary

```
[Employee Browser]
       │
       ▼
  Vercel (React/Vite)          → frontend/
       │  HTTPS REST calls
       ▼
  Railway (FastAPI/uvicorn)    → backend/
       │  Supabase client
       ▼
  Supabase (PostgreSQL + Auth) → supabase/migrations/
       │  JWT tokens
       └──────────────────────── back to Railway auth middleware

  Anthropic Claude API         → ai_service.py (called from Railway)
```
