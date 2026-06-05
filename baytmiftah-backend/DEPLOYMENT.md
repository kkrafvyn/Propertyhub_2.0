# BaytMiftah Backend Deployment Guide

## Local Development with Docker Compose

### Prerequisites
- Docker Desktop installed
- Environment variables configured in `.env`

### Start Development Environment
```bash
# Create .env from template
cp .env.example .env

# Fill in your Supabase and email credentials

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Services Running
- **API**: http://localhost:3001
- **Redis**: localhost:6379
- **Health Check**: http://localhost:3001/health

---

## Deployment to Vercel

### Prerequisites
- Vercel account (free tier available)
- GitHub repository connected

### Deployment Steps

#### 1. Connect GitHub to Vercel
```bash
npm install -g vercel
vercel
```

#### 2. Environment Variables in Vercel
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
JWT_SECRET=your-secret
FRONTEND_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@baytmiftah.com
REDIS_URL=redis://... (use external Redis provider)
NODE_ENV=production
```

#### 3. For Node.js on Vercel
Create `api/index.js` or update package.json:
```json
{
  "version": 2,
  "builds": [
    { "src": "src/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "src/index.js" }
  ]
}
```

#### 4. Deploy
```bash
vercel --prod
```

### Custom Domain on Vercel
1. Go to Vercel dashboard
2. Project Settings → Domains
3. Add your domain (e.g., api.baytmiftah.com)
4. Update DNS records as shown

### Serverless Function Limitations
- Max execution time: 60 seconds
- Memory: 3 GB
- For background jobs, use external service (see below)

---

## Deployment to Railway

### Prerequisites
- Railway account
- GitHub repository

### Steps
1. **Connect GitHub**
   - Go to railway.app
   - Create new project → GitHub
   - Select repository

2. **Add Environment Variables**
   - Go to project settings
   - Add all variables from `.env.example`

3. **Auto-deploy on Push**
   - Railway automatically deploys on git push
   - Monitor deployments in Railway dashboard

4. **Upgrade Plan** (if needed for production)
   - Free tier: 500 hours/month
   - Paid plans: unlimited

---

## Deployment to Render

### Prerequisites
- Render account
- GitHub repository

### Steps
1. **Create Web Service**
   - Dashboard → New → Web Service
   - Connect GitHub repository
   - Select `baytmiftah-backend` branch

2. **Configure Service**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

3. **Add Environment Variables**
   - Go to Environment tab
   - Add all variables from `.env.example`

4. **Deploy**
   - Click Deploy
   - Monitor in Render dashboard

---

## Background Jobs & Email Queue

For production email sending, use external service:

### Option 1: Bull + Redis Cloud
```bash
npm install bull redis
```

```javascript
// Queue setup in backend
import Queue from 'bull'

const emailQueue = new Queue('emails', process.env.REDIS_URL)

// Add to queue
emailQueue.add({
  to: 'user@example.com',
  subject: 'Invitation',
  template: 'invitation'
})

// Process jobs
emailQueue.process(5, async (job) => {
  const { to, subject, template } = job.data
  await sendEmail(to, subject, getTemplate(template))
})
```

### Option 2: Supabase Edge Functions + Deno
Deploy email handlers as Edge Functions for faster execution.

### Redis Cloud Setup
1. Go to redis.com
2. Create free account
3. Create database
4. Copy connection string to `REDIS_URL`

---

## Database Backups

### Supabase Automatic Backups
- Free tier: Daily backups (7 days retention)
- Pro tier: Daily backups (30 days retention)
- Custom backups available

### Manual Backup
```bash
# Export database
pg_dump -U postgres -h your-host -d your-db > backup.sql

# Restore
psql -U postgres -h your-host -d your-db < backup.sql
```

---

## Monitoring & Logging

### Vercel
- Logs: Dashboard → Deployments → Runtime Logs
- Error tracking: Sentry integration available

### Railway
- Logs: Project dashboard → Deployments
- Metrics: CPU, memory, network usage

### Render
- Logs: Service dashboard → Logs
- Alerts: Available in paid plans

### Add Sentry for Error Tracking
```bash
npm install @sentry/node

import * as Sentry from "@sentry/node"

Sentry.init({ dsn: process.env.SENTRY_DSN })
```

---

## Scaling & Performance

### Database Optimization
- Add indexes on frequently queried columns
- Use connection pooling (Supabase includes this)
- Monitor slow queries

### API Caching
- Use Redis for caching frequent queries
- Set TTL (time-to-live) on cache keys

### CDN for Static Assets
- Vercel includes CDN by default
- Consider Cloudflare for additional caching

---

## Security Checklist

- ✅ Environment variables in `.env` (never commit)
- ✅ HTTPS only (automatic on Vercel/Railway/Render)
- ✅ CORS configured for frontend domain
- ✅ Rate limiting on API endpoints
- ✅ SQL injection prevention (use parameterized queries)
- ✅ JWT token validation on all protected routes
- ✅ Helmet.js security headers (already configured)

---

## Rollback Plan

### If deployment fails:
```bash
# Vercel
vercel rollback

# Railway
# Use previous deployment from dashboard

# Render
# Revert to previous commit on GitHub
```

---

## Cost Estimation (Monthly)

| Service | Free Tier | Pro Tier |
|---------|-----------|----------|
| Vercel | $0 | $20-100 |
| Railway | $5 | $20+ |
| Render | $7 | $15+ |
| Supabase | $0 | $25+ |
| Redis Cloud | $0 | $15+ |
| SendGrid | $0 (100 emails) | $10+ |

**Total for production**: ~$50-150/month
