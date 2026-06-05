# BaytMiftah Edge Functions Backend

Complete backend using **Supabase Edge Functions** (TypeScript + Deno).

## 📦 What's Included

✅ **11 Edge Functions**
- Authentication (signup, login)
- Agencies (CRUD, team management, analytics)
- Smart Devices (CRUD, commands, logs, alerts)
- Automation (rule management)

✅ **TypeScript Support**
- Full type safety
- IDE autocomplete
- Better error catching

✅ **Serverless**
- Auto-scales
- Zero server management
- Fast deployment (30 seconds)

✅ **Production Ready**
- Error handling
- CORS configuration
- JWT authentication
- Role-based access

---

## 🚀 Quick Start

### Local Development
```bash
# 1. Start Supabase
supabase start

# 2. Serve functions
supabase functions serve

# 3. Test API
curl http://localhost:54321/functions/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123","displayName":"Test"}'
```

### Production Deployment
```bash
# 1. Link to project
supabase link --project-ref your-project-ref

# 2. Deploy
supabase functions deploy

# 3. Functions live at:
# https://your-project-ref.functions.supabase.co/auth/signup
# https://your-project-ref.functions.supabase.co/agencies
# etc.
```

---

## 📁 File Structure

```
baytmiftah-backend/
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── auth.ts          # JWT, token generation
│   │   │   └── cors.ts          # CORS headers, responses
│   │   ├── auth/
│   │   │   ├── signup.ts        # Register user
│   │   │   └── login.ts         # Sign in user
│   │   ├── agencies/
│   │   │   ├── index.ts         # List & create
│   │   │   ├── [id].ts          # Get, update, delete
│   │   │   └── team.ts          # Team member management
│   │   ├── smart-devices/
│   │   │   ├── index.ts         # List & create devices
│   │   │   ├── [id].ts          # Device CRUD
│   │   │   └── command.ts       # Send commands
│   │   └── automation/
│   │       ├── index.ts         # List & create rules
│   │       └── [id].ts          # Update, delete rules
│   └── migrations/              # SQL migrations
├── deno.json                    # Deno config
├── supabase.json               # Supabase CLI config
└── .env.local                  # Local environment variables
```

---

## 🔌 API Endpoints

All endpoints protected with JWT authentication (except auth routes).

### Auth (No JWT Required)
```
POST /auth/signup          - Create user account
POST /auth/login           - Sign in user, get JWT token
```

### Agencies
```
GET  /agencies             - Get all agencies (admin only)
GET  /agencies/:id         - Get specific agency
POST /agencies             - Create agency
PUT  /agencies/:id         - Update agency
DELETE /agencies/:id       - Delete agency
GET  /agencies/team        - Get team members
POST /agencies/team        - Add team member
```

### Smart Devices
```
GET  /smart-devices        - Get all user's devices
GET  /smart-devices/:id    - Get specific device
POST /smart-devices        - Create device
PUT  /smart-devices/:id    - Update device
DELETE /smart-devices/:id  - Delete device
POST /smart-devices/command - Send device command
```

### Automation
```
GET  /automation           - Get all rules
GET  /automation/:id       - Get specific rule
POST /automation           - Create rule
PUT  /automation/:id       - Update rule
DELETE /automation/:id     - Delete rule
```

---

## 🔐 Authentication

All protected endpoints require JWT token in Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token obtained from `/auth/login` response.

---

## 🌐 Environment Variables

### Local Development (.env.local)
```env
JWT_SECRET=your-secret-key-here
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Production (via `supabase secrets set`)
```bash
supabase secrets set JWT_SECRET=production-secret
supabase secrets set SMTP_USER=sendgrid@email.com
supabase secrets set SMTP_PASS=sg-xxx
```

---

## 🧪 Testing

### Using cURL
```bash
# Signup
curl -X POST http://localhost:54321/functions/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "SecurePass123",
    "displayName": "John Doe"
  }'

# Login
curl -X POST http://localhost:54321/functions/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "SecurePass123"}'

# Protected endpoint (use token from login)
curl -X GET http://localhost:54321/functions/v1/agencies \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Frontend
Frontend automatically calls these endpoints when configured with correct API URL:
```env
REACT_APP_API_URL=http://localhost:54321/functions/v1
```

---

## 🚨 Error Handling

All functions return consistent error responses:

```json
{
  "error": "Descriptive error message",
  "status": 400
}
```

Common errors:
- `400` - Missing required fields
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (no access)
- `404` - Not found
- `500` - Server error

---

## 📊 Monitoring

### Local Logs
```bash
# When running: supabase functions serve
# Logs appear in terminal real-time

supabase functions serve --debug  # More verbose
```

### Production Logs
```bash
# View in Supabase Studio
# Dashboard → Edge Functions → Logs

# Or stream via CLI
supabase functions serve --debug
```

---

## 💰 Costs

Supabase Edge Functions pricing:
- **Free tier**: 500,000 requests/month
- **Paid**: $0.000005 per request after free tier

Most applications stay in the free tier.

---

## 🔄 Migration from Express

This replaces the Express backend entirely. The frontend doesn't change, just update:

```javascript
// In src/services/agency-service.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:54321/functions/v1'

// All existing methods work the same!
export const getAgencies = async (token) => {
  return fetch(`${API_URL}/agencies`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json())
}
```

---

## 📚 Documentation

See also:
- `DATABASE_SCHEMA.md` - Database table structure
- `EDGE_FUNCTIONS_SETUP.md` - Detailed setup guide
- `QUICKSTART_EDGE.md` - Quick start reference

---

**Status**: ✅ Ready to deploy

**Next steps**:
1. Run `supabase start`
2. Create database tables (from DATABASE_SCHEMA.md)
3. Test endpoints locally
4. Deploy with `supabase link && supabase functions deploy`
