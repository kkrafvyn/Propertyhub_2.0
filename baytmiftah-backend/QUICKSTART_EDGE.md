# BaytMiftah Edge Functions - Quick Start

## 🚀 Start Local Development (10 minutes)

### 1. Install Supabase CLI
```powershell
# Windows: Download from GitHub releases or use scoop
# https://github.com/supabase/cli/releases

# Or with scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify installation
supabase --version
```

### 2. Start Supabase Locally
```bash
cd baytmiftah-backend

# Start local Supabase (requires Docker)
supabase start

# Output shows:
# API URL: http://localhost:54321
# Database URL: postgresql://...
```

### 3. Start Edge Functions
```bash
# In another terminal
supabase functions serve

# Functions available at:
# http://localhost:54321/functions/v1/auth/signup
# http://localhost:54321/functions/v1/auth/login
# http://localhost:54321/functions/v1/agencies
# etc.
```

### 4. Frontend Development
```bash
cd ../baytmiftah

npm install
npm run dev

# Available at http://localhost:5173
```

---

## 📝 API Endpoints

### Authentication
```bash
# Signup
POST http://localhost:54321/functions/v1/auth/signup
{ "email": "user@test.com", "password": "pass", "displayName": "John" }

# Login
POST http://localhost:54321/functions/v1/auth/login
{ "email": "user@test.com", "password": "pass" }
```

### Agencies (requires JWT token)
```bash
# Get all agencies
GET http://localhost:54321/functions/v1/agencies
Authorization: Bearer YOUR_TOKEN

# Get agency
GET http://localhost:54321/functions/v1/agencies/:id

# Create agency
POST http://localhost:54321/functions/v1/agencies
{ "companyName": "...", "licenseNumber": "...", "email": "...", "phone": "..." }

# Update/Delete
PUT/DELETE http://localhost:54321/functions/v1/agencies/:id
```

### Smart Devices
```bash
# Get all devices
GET http://localhost:54321/functions/v1/smart-devices

# Create device
POST http://localhost:54321/functions/v1/smart-devices
{ "name": "Front Lock", "type": "smart_lock", ... }

# Send command
POST http://localhost:54321/functions/v1/smart-devices?deviceId=...&action=lock
```

### Automation
```bash
# Get rules
GET http://localhost:54321/functions/v1/automation

# Create rule
POST http://localhost:54321/functions/v1/automation
{ "name": "Motion Lock", "trigger": "motion_detected", "action": "lock" }
```

---

## 🔧 Environment Setup

### Local (.env.local in supabase/functions/)
Create file: `supabase/functions/.env.local`
```env
JWT_SECRET=your-dev-secret-key
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

Get keys from Supabase Studio (http://localhost:54323):
- Go to Settings → API
- Copy ANON_KEY and SERVICE_ROLE_KEY

### Frontend (.env.local)
```env
REACT_APP_API_URL=http://localhost:54321/functions/v1
```

---

## 🎯 Checklist

- [ ] Install Supabase CLI
- [ ] `supabase start` runs locally
- [ ] `supabase functions serve` shows functions
- [ ] Create database tables (from DATABASE_SCHEMA.md)
- [ ] Frontend can call /auth/signup
- [ ] Login returns JWT token
- [ ] Protected endpoints work with token
- [ ] Real-time updates work (device changes)
- [ ] Deploy to production

---

## 🚀 Deploy to Production

### 1. Link to Supabase Project
```bash
supabase link --project-ref your-project-ref
# Get project ref from Supabase dashboard URL
```

### 2. Deploy Functions
```bash
supabase functions deploy
```

### 3. Set Secrets
```bash
supabase secrets set JWT_SECRET=your-prod-secret
supabase secrets set SMTP_USER=your-email
supabase secrets set SMTP_PASS=your-app-password
```

### 4. Update Frontend
```env
REACT_APP_API_URL=https://your-project-ref.functions.supabase.co
```

---

## 🆘 Troubleshooting

**"supabase: command not found"**
- Reinstall CLI or add to PATH

**"Docker required"**
- Install Docker Desktop: https://www.docker.com/products/docker-desktop

**"Connection refused on localhost:54321"**
- Run `supabase start` first

**"Unauthorized" error**
- Check JWT_SECRET is set
- Verify token is valid (not expired)

**Real-time not working**
- Enable realtime in Supabase Studio for tables
- Check WebSocket connection in browser DevTools

---

**Ready? Run `supabase start` to begin! 🚀**
