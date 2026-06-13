# BaytMiftah (Property Hub 2.0)

Real-estate marketplace and operations platform (React + Vite + Supabase).

**Repository:** [github.com/kkrafvyn/Propertyhub_2.0](https://github.com/kkrafvyn/Propertyhub_2.0) — active branch: `baytmiftah-rebuild`

## Setup

```bash
npm install
cp .env.example .env   # add VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Backend (Supabase)

**Project ref:** `tcnsqtnwyyufeupktkhs`

```bash
npm run check:supabase          # verify .env connection
npx supabase login
npx supabase link --project-ref tcnsqtnwyyufeupktkhs
npm run db:push                 # apply migrations
npm run deploy:backend          # deploy Edge Functions
```

If CLI link fails, run bundled SQL in the [Supabase SQL Editor](https://supabase.com/dashboard/project/tcnsqtnwyyufeupktkhs/sql/new):

```bash
npm run db:bundle               # writes scripts/all-migrations.sql
```

## Listing flow (end-to-end test)

1. Sign up as **property owner** or **agency owner** at `/signup`
2. Submit a listing at `/host/list`
3. Track status at `/host/listings` (pending → active)
4. As **agency owner**, open `/admin/moderation` → **Approve & publish**
5. Listing appears on home `/` and `/property/:id`

Agency owners and platform admins can moderate. Edge Functions work when deployed; direct Postgres + RLS fallbacks work without them after migrations.

## Build

```bash
npm run build
```
