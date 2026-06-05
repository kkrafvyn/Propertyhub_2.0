# BaytMiftah Backend Setup Guide

## Installation

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account and project
- Redis (for background jobs)

### 2. Install Dependencies
```bash
cd baytmiftah-backend
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```

Fill in your `.env` file with:
- Supabase credentials (URL, keys)
- JWT secret
- SMTP credentials (for email)
- Redis URL
- Frontend URL

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/verify-email` - Verify email address

### Agency Management
- `GET /api/agencies` - Get all agencies (admin only)
- `POST /api/agencies` - Create new agency
- `GET /api/agencies/:agencyId` - Get agency details
- `PUT /api/agencies/:agencyId` - Update agency
- `DELETE /api/agencies/:agencyId` - Delete agency
- `GET /api/agencies/:agencyId/team` - Get team members
- `POST /api/agencies/:agencyId/team` - Add team member
- `POST /api/agencies/:agencyId/verify` - Verify agency (admin only)
- `GET /api/agencies/:agencyId/analytics` - Get agency analytics

### Smart Devices
- `GET /api/smart-devices` - Get all devices
- `POST /api/smart-devices` - Create new device
- `GET /api/smart-devices/:deviceId` - Get device details
- `PUT /api/smart-devices/:deviceId` - Update device
- `DELETE /api/smart-devices/:deviceId` - Delete device
- `POST /api/smart-devices/:deviceId/command` - Send device command
- `GET /api/smart-devices/:deviceId/status` - Get device status
- `GET /api/smart-devices/:deviceId/logs` - Get device event logs
- `GET /api/smart-devices/alerts` - Get all alerts
- `PUT /api/smart-devices/alerts/:alertId/dismiss` - Dismiss alert

### Automation Rules
- `GET /api/automation` - Get all rules
- `POST /api/automation` - Create new rule
- `PUT /api/automation/:ruleId` - Update rule
- `DELETE /api/automation/:ruleId` - Delete rule

## Database Schema

Tables to create in Supabase:

### user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### agencies
```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  company_name TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  website TEXT,
  description TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  verification_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### agency_members
```sql
CREATE TABLE agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES user_profiles(id),
  role TEXT DEFAULT 'agent',
  status TEXT DEFAULT 'invited',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### smart_devices
```sql
CREATE TABLE smart_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  property_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  mac_address TEXT,
  pairing_code TEXT,
  status TEXT DEFAULT 'offline',
  battery_level INTEGER,
  signal_strength INTEGER,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### smart_automation_rules
```sql
CREATE TABLE smart_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  property_id UUID,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  action TEXT NOT NULL,
  trigger_device_id UUID REFERENCES smart_devices(id),
  action_device_id UUID REFERENCES smart_devices(id),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### smart_device_logs
```sql
CREATE TABLE smart_device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES smart_devices(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### smart_alerts
```sql
CREATE TABLE smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  property_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  alert_type TEXT,
  severity TEXT DEFAULT 'info',
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Development

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Production Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t baytmiftah-backend .
docker run -p 3001:3001 baytmiftah-backend
```

### Railway or Render
1. Connect your GitHub repo
2. Set environment variables
3. Deploy

## Architecture

- **Routes**: API endpoint definitions
- **Services**: Business logic and database queries
- **Middleware**: Authentication, error handling, validation
- **Lib**: Supabase client configuration

## Real-time Features

Use Supabase subscriptions for:
- Device status updates
- Alert notifications
- Device log streaming
- Agency updates

## Background Jobs

Use Bull/Redis for:
- Sending emails
- Device syncing
- Report generation
- Data cleanup
