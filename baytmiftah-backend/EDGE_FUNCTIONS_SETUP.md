# Supabase Edge Functions Deployment

## What Changed

We've moved from **Node.js Express** to **Supabase Edge Functions** for instant deployment and full Supabase control.

### Benefits
- ✅ No server management (serverless)
- ✅ Auto-scales to infinity
- ✅ Deployed in 30 seconds
- ✅ Free tier covers most use cases
- ✅ TypeScript support out-of-the-box
- ✅ Live environment variables
- ✅ Real-time debugging logs

---

## Local Development Setup

### 1. Install Supabase CLI

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell):**
```powershell
# Install with scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download directly from:
# https://github.com/supabase/cli/releases
```

### 2. Start Supabase Locally

```bash
cd baytmiftah-backend

# Initialize Supabase (if not done)
supabase init

# Start Supabase (Docker required)
supabase start

# This starts:
# - PostgreSQL database on localhost:5432
# - Supabase Studio on localhost:54323
# - Edge Functions locally on localhost:54321
```

### 3. Develop Functions Locally

```bash
# Watch for changes and auto-reload
supabase functions serve

# Terminal output shows:
# Supabase Functions ready on http://localhost:54321

# Functions available at:
# http://localhost:54321/functions/v1/auth/signup
# http://localhost:54321/functions/v1/agencies
# http://localhost:54321/functions/v1/smart-devices
# etc.
```

---

## Edge Functions Structure

```
supabase/functions/
├── _shared/
│   ├── auth.ts          # JWT verification, token generation
│   └── cors.ts          # CORS headers, JSON responses
├── auth/
│   ├── signup.ts        # Create user + profile
│   └── login.ts         # Sign in user
├── agencies/
│   ├── index.ts         # GET all, POST create
│   ├── [id].ts          # GET, PUT, DELETE agency
│   └── team.ts          # GET team members, POST add member
├── smart-devices/
│   ├── index.ts         # GET all, POST create device
│   ├── [id].ts          # GET, PUT, DELETE device
│   └── command.ts       # POST device command
├── automation/
│   ├── index.ts         # GET rules, POST create rule
│   └── [id].ts          # PUT, DELETE rule
└── .env.local           # Local environment variables
```

---

## Testing Edge Functions Locally

### Test Signup
```bash
curl -X POST http://localhost:54321/functions/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123",
    "displayName": "John Doe"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:54321/functions/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

### Test Protected Endpoint (with JWT)
```bash
# Get the token from login response, then:
curl -X GET http://localhost:54321/functions/v1/agencies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## Environment Variables

Create `.env.local` in `supabase/functions/`:

```env
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email (optional)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Frontend
FRONTEND_URL=http://localhost:5173
```

Get keys from: **Supabase Dashboard → Settings → API**

---

## Deploying to Production

### 1. Push Functions to Supabase Cloud

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy auth/signup
```

### 2. Set Production Environment Variables

```bash
# Set variable
supabase secrets set JWT_SECRET=your-prod-jwt-secret
supabase secrets set SMTP_USER=your-email@sendgrid.com
supabase secrets set SMTP_PASS=your-sendgrid-key

# View all secrets
supabase secrets list
```

### 3. Production Function URLs

Functions deploy to:
```
https://your-project-ref.functions.supabase.co/auth/signup
https://your-project-ref.functions.supabase.co/agencies
https://your-project-ref.functions.supabase.co/smart-devices
```

Update Frontend with production URL in `.env.production`:
```env
REACT_APP_API_URL=https://your-project-ref.functions.supabase.co
```

---

## Monitoring Edge Functions

### View Logs
```bash
# Stream real-time logs
supabase functions serve --debug

# Or view in Supabase Studio:
# Dashboard → Edge Functions → Logs
```

### Performance Metrics
Available in Supabase Dashboard:
- Request count
- Error rate
- Average response time
- CPU usage
- Memory usage

---

## Debugging

### Local Testing
```bash
# Add console.log() statements in functions
console.log("Debug info:", data)

# Logs appear in terminal when running:
supabase functions serve
```

### Production Debugging
```bash
# View production logs
supabase functions serve --debug

# Or in Supabase Studio:
# Dashboard → Functions → Select function → Logs tab
```

### Common Issues

**CORS Error:**
- Solution: CORS headers are set in `_shared/cors.ts`
- Ensure function returns `corsHeaders`

**Authentication Error:**
- Check JWT_SECRET matches between local and production
- Verify token format: `Authorization: Bearer token-here`

**Database Connection Error:**
- Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct
- Check database is running (for local: `supabase start`)

**Timeout Error:**
- Default timeout: 10 seconds
- Optimize database queries
- Use indexes on frequently queried columns

---

## Cost (Free Tier)

Supabase Edge Functions:
- **Pricing**: $0 for first 500K requests/month, then $0.000005/request
- **Execution time**: Up to 60 seconds per function
- **Memory**: 512MB
- **Concurrency**: Unlimited

For most apps, this stays **$0/month**

---

## Migration from Node.js Express

### What Changed
| Aspect | Express | Edge Functions |
|--------|---------|-----------------|
| Server | Node.js | Deno |
| Language | JavaScript | TypeScript |
| Hosting | Vercel/Railway | Supabase Cloud |
| Database | Supabase | Supabase (same) |
| Deployment | GitHub CI/CD | `supabase functions deploy` |

### What Stayed the Same
- ✅ Database schema (identical)
- ✅ API endpoints (same URLs, just hosted differently)
- ✅ Frontend code (no changes needed)
- ✅ Real-time subscriptions (Supabase handles)
- ✅ Email templates (can still use Nodemailer)

### Frontend Update
Only the API base URL changes:

```javascript
// Before (Express)
const API_URL = 'http://localhost:3001/api'

// After (Edge Functions)
const API_URL = 'http://localhost:54321/functions/v1'
```

Update in `src/services/agency-service.js`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:54321/functions/v1'

export const getAgencies = async (token) => {
  const response = await fetch(`${API_URL}/agencies`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.json()
}
```

---

## Rollback to Express

If you need to go back to Node.js Express:

```bash
# Delete Edge Functions
rm -rf supabase/functions/

# Restore from backup
git checkout src/

# Deploy to Vercel/Railway as before
vercel deploy
```

---

## Next Steps

1. **Test locally**
   ```bash
   supabase start
   supabase functions serve
   ```

2. **Create tables in Supabase** (from DATABASE_SCHEMA.md)

3. **Update frontend with new API URL**

4. **Test all endpoints** with cURL or Postman

5. **Deploy to production**
   ```bash
   supabase link --project-ref your-project
   supabase functions deploy
   supabase secrets set JWT_SECRET=your-secret
   ```

---

## Useful Links

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Manual](https://deno.land/manual)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/supabase-functions-deploy)
