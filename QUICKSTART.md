# BaytMiftah Quick Start Guide

## 🚀 Start Local Development (5 minutes)

### 1. Frontend
```bash
cd baytmiftah
npm install
cp .env.example .env.local
npm run dev
```
**Available at**: http://localhost:5173

### 2. Backend
```bash
cd baytmiftah-backend
npm install
cp .env.example .env
npm run dev
```
**Available at**: http://localhost:3001

### 3. Database
- Go to [Supabase](https://supabase.com)
- Create new project
- Copy credentials to `.env` files

### 4. Health Check
```bash
curl http://localhost:3001/health
# Response: { "status": "ok", "timestamp": "..." }
```

---

## 📝 First Tasks Checklist

### Setup Database Tables
1. Copy SQL from `baytmiftah-backend/DATABASE_SCHEMA.md`
2. Paste in Supabase SQL Editor
3. Run each table creation script

### Configure Email
1. Get Gmail app password (see `EMAIL_CONFIG.md`)
2. Update `.env` with SMTP credentials
3. Test: `curl -X POST http://localhost:3001/api/test-email`

### Create First User
1. Go to http://localhost:5173/signup
2. Register account
3. Verify email in Supabase

### Create First Agency
1. Login
2. Go to `/agency/onboarding`
3. Complete 4-step wizard
4. Wait for admin verification

### Invite Team Member
1. In agency dashboard
2. Click "Invite Member"
3. Enter email + role
4. Check email for invitation

### Add Smart Device
1. Go to `/smart-property/devices`
2. Click "Add Device"
3. Complete 4-step wizard
4. Device should appear in dashboard (real-time update)

---

## 🔗 API Endpoints Quick Reference

### Authentication
```bash
# Signup
POST /api/auth/signup
{ "email": "user@example.com", "password": "...", "displayName": "John" }

# Login
POST /api/auth/login
{ "email": "user@example.com", "password": "..." }
# Returns: { "user": {...}, "token": "eyJhbG..." }

# Use token in all protected requests
Authorization: Bearer eyJhbG...
```

### Agencies
```bash
# Create agency
POST /api/agencies -H "Authorization: Bearer TOKEN"
{ "companyName": "...", "licenseNumber": "...", "email": "...", "phone": "..." }

# Get agency details
GET /api/agencies/:agencyId -H "Authorization: Bearer TOKEN"

# Get agency analytics
GET /api/agencies/:agencyId/analytics -H "Authorization: Bearer TOKEN"

# Add team member
POST /api/agencies/:agencyId/team -H "Authorization: Bearer TOKEN"
{ "email": "agent@example.com", "role": "agent" }
```

### Smart Devices
```bash
# Get all devices
GET /api/smart-devices?propertyId=prop-123 -H "Authorization: Bearer TOKEN"

# Create device
POST /api/smart-devices -H "Authorization: Bearer TOKEN"
{ "propertyId": "...", "name": "Front Door Lock", "type": "smart_lock", ... }

# Send device command
POST /api/smart-devices/:deviceId/command -H "Authorization: Bearer TOKEN"
{ "action": "lock", "parameters": {} }

# Get device status
GET /api/smart-devices/:deviceId/status -H "Authorization: Bearer TOKEN"

# Get device logs
GET /api/smart-devices/:deviceId/logs -H "Authorization: Bearer TOKEN"
```

### Automation
```bash
# Get all rules
GET /api/automation -H "Authorization: Bearer TOKEN"

# Create rule
POST /api/automation -H "Authorization: Bearer TOKEN"
{ "propertyId": "...", "name": "Motion Lock", "trigger": "motion_detected", "action": "lock" }

# Update rule
PUT /api/automation/:ruleId -H "Authorization: Bearer TOKEN"
{ "enabled": false }
```

---

## 📊 Project Statistics

- **Frontend**: 1,150 LOC (13 pages)
- **Backend**: 2,800 LOC (29 endpoints)
- **Database**: 9 tables with indexes
- **Tests**: Jest configured with examples
- **Documentation**: 20,000+ words

---

## 🚨 Troubleshooting

### Frontend won't start
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend connection error
```bash
# Check Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Restart backend
npm run dev
```

### Database table not found
```bash
# Verify in Supabase dashboard
1. Go to SQL Editor
2. Run: SELECT * FROM information_schema.tables WHERE table_name = 'agencies';
3. If not found, run schema creation scripts from DATABASE_SCHEMA.md
```

### Real-time updates not working
```bash
# Verify Supabase real-time is enabled
1. Dashboard → Database → Tables → Enable Realtime for each table
2. Restart backend
3. Check browser console for WebSocket connection
```

### Email not sending
```bash
# Test SMTP connection
1. Verify .env has SMTP credentials
2. Check Gmail app password is correct
3. Enable "Less secure apps" if using Gmail
4. Test with: npm run test:email
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to strong random value
- [ ] Enable Supabase RLS on all tables
- [ ] Set CORS to specific domains only
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Set environment variables in deployment platform
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Enable email verification for new signups
- [ ] Set rate limiting on API endpoints
- [ ] Configure backup strategy in Supabase
- [ ] Set up monitoring (Sentry)

---

## 📈 Next Immediate Steps

### This Week
1. Create all 9 database tables
2. Set up email (Gmail or SendGrid)
3. Test complete user flow (signup → agency → device)
4. Fix any bugs found in testing

### Next Week
1. Deploy backend to Vercel
2. Deploy frontend to Vercel
3. Connect custom domain
4. Enable monitoring
5. Load test API endpoints

### Following Week
1. User acceptance testing
2. Security audit
3. Performance optimization
4. Documentation review
5. Go live! 🎉

---

## 💰 Free Services (to save costs)

1. **Supabase**: 500MB free database
2. **Vercel**: Free tier for frontend/backend
3. **Redis Cloud**: Free tier for job queue
4. **SendGrid**: 100 free emails/day
5. **Sentry**: 5,000 free error events/month
6. **GitHub**: Free private repositories

---

## 📚 Full Documentation

| Document | Purpose |
|----------|---------|
| `README.md` (backend) | API endpoints & setup |
| `DATABASE_SCHEMA.md` | SQL migrations & tables |
| `DEPLOYMENT.md` | Production deployment guide |
| `EMAIL_CONFIG.md` | Email setup & testing |
| `IMPLEMENTATION.md` | Full feature summary |
| `jest.config.js` | Test configuration |

---

## 🎯 Success Criteria

✅ **Phase 1 Complete** (Right Now)
- Frontend: 13 pages with real-time updates
- Backend: 29 API endpoints
- Database schema: Defined & documented
- Deployment: Configuration files ready

🎯 **Phase 2 Target** (This Week)
- Database: All tables created & indexed
- Email: Working for all scenarios
- Testing: 70%+ coverage
- Monitoring: Sentry configured

🚀 **Phase 3 Goal** (This Month)
- Production deployment live
- 100+ test cases passing
- Performance: < 200ms API response
- Security: All RLS policies active

---

## 🆘 Need Help?

**Backend Issues**
- Check logs: `npm run dev` output
- API test: `curl http://localhost:3001/health`
- Database: Supabase SQL Editor

**Frontend Issues**
- Check console: Open DevTools (F12)
- Network: Check API calls in Network tab
- Zustand: Check store values in Redux DevTools

**Database Issues**
- Supabase Dashboard → SQL Editor
- Check table: `SELECT COUNT(*) FROM table_name;`
- View logs: Dashboard → Logs

**Deployment Issues**
- Check Vercel logs: Dashboard → Deployments
- Environment variables: Ensure all set
- Domain DNS: Verify CNAME records

---

**Ready to build? Start with Phase 1 setup above! 🚀**
