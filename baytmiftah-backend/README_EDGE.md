# BaytMiftah - Supabase Edge Functions Backend

This backend uses **Supabase Edge Functions** (TypeScript + Deno) instead of Node.js Express.

## What This Means

✅ **Full control** - All business logic runs in Edge Functions  
✅ **Serverless** - No servers to manage  
✅ **Auto-scaling** - Handles any load automatically  
✅ **Fast deployment** - Deploy in 30 seconds  
✅ **Free tier** - First 500K requests free per month  

---

## Quick Start

### 1. Install Supabase CLI
```powershell
# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# macOS/Linux  
brew install supabase/tap/supabase
```

### 2. Start Local Supabase
```bash
cd baytmiftah-backend
supabase start

# In another terminal:
supabase functions serve
```

### 3. Functions Available At
```
http://localhost:54321/functions/v1/auth/signup
http://localhost:54321/functions/v1/auth/login
http://localhost:54321/functions/v1/agencies
http://localhost:54321/functions/v1/smart-devices
http://localhost:54321/functions/v1/automation
```

### 4. Update Frontend URL
Copy `.env.edge-functions` to `.env.local`:
```bash
cp .env.edge-functions ..\..\baytmiftah\.env.local
```

---

## What Changed From Express

| Item | Express | Edge Functions |
|------|---------|-----------------|
| Language | JavaScript | TypeScript |
| Server | Node.js | Deno |
| Hosting | Vercel/Railway | Supabase Cloud |
| Deployment | GitHub CI/CD | `supabase functions deploy` |

**What DIDN'T change:**
- Database schema (same 9 tables)
- API endpoints (same 29 routes)
- Frontend code (same React components)
- Real-time functionality (same Supabase subscriptions)

---

## Deploy to Production

```bash
# 1. Link to your Supabase project
supabase link --project-ref your-project-id

# 2. Deploy functions
supabase functions deploy

# 3. Set environment variables
supabase secrets set JWT_SECRET=your-production-secret
supabase secrets set SMTP_USER=your-email@sendgrid.com
supabase secrets set SMTP_PASS=your-api-key

# 4. Update frontend with production URL
REACT_APP_API_URL=https://your-project-id.functions.supabase.co
```

---

## Next Steps

1. Run `supabase start` to begin local development
2. Create database tables (see DATABASE_SCHEMA.md)
3. Update frontend `.env.local` with API URL
4. Test authentication flow
5. Deploy to production

See **EDGE_FUNCTIONS_SETUP.md** for detailed setup instructions.
See **QUICKSTART_EDGE.md** for quick reference.
