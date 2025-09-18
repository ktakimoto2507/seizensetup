seizensetup – STEP 3 (Supabase Auth + DB) quick start
====================================================

What you'll get:
- Email+Password auth UI  (/auth/login)
- Postgres schema (profiles / beneficiaries / results) + RLS
- Minimal client (src/lib/supabase/client.ts)
- LocalStorage <-> DB sync helpers
- Dev test page (/dev/db) to verify save/pull flows

Apply (from repo root):
1) Copy files from this ZIP into your repo root.
2) npm i @supabase/supabase-js
3) Set envs locally (.env.local) and on Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4) Supabase → SQL Editor → paste supabase/schema.sql and run.
5) npm run dev → open /auth/login, then /dev/db to test.
