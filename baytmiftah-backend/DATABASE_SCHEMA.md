# BaytMiftah Database Schema & Migrations

## Creating Tables in Supabase

Run these SQL commands in Supabase SQL Editor (or use migrations):

### 1. User Profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'agent', 'manager', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
```

### 2. Agencies
```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  website TEXT,
  description TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agencies_user_id ON agencies(user_id);
CREATE INDEX idx_agencies_verification_status ON agencies(verification_status);
```

### 3. Agency Members
```sql
CREATE TABLE agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('agent', 'manager', 'admin')),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agency_members_agency_id ON agency_members(agency_id);
CREATE INDEX idx_agency_members_email ON agency_members(email);
CREATE INDEX idx_agency_members_user_id ON agency_members(user_id);
```

### 4. Properties (Listings)
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price DECIMAL(15, 2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_feet INTEGER,
  property_type TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold')),
  image_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_agency_id ON properties(agency_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_location ON properties(location);
```

### 5. Leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  property_interest TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'closed')),
  assigned_agent_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_agency_id ON leads(agency_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_agent_id ON leads(assigned_agent_id);
```

### 6. Smart Devices
```sql
CREATE TABLE smart_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  property_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('smart_lock', 'camera', 'light', 'sensor', 'thermostat')),
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  mac_address TEXT,
  pairing_code TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('offline', 'online', 'pairing', 'error')),
  battery_level INTEGER,
  signal_strength INTEGER,
  last_seen TIMESTAMP,
  paired_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smart_devices_user_id ON smart_devices(user_id);
CREATE INDEX idx_smart_devices_property_id ON smart_devices(property_id);
CREATE INDEX idx_smart_devices_status ON smart_devices(status);
```

### 7. Smart Automation Rules
```sql
CREATE TABLE smart_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  property_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('motion_detected', 'door_unlocked', 'temp_above', 'temp_below', 'time')),
  action TEXT NOT NULL CHECK (action IN ('lock', 'unlock', 'turn_on', 'turn_off', 'set_temp', 'set_brightness')),
  trigger_device_id UUID REFERENCES smart_devices(id) ON DELETE SET NULL,
  action_device_id UUID REFERENCES smart_devices(id) ON DELETE SET NULL,
  trigger_value DECIMAL(10, 2),
  action_value DECIMAL(10, 2),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_user_id ON smart_automation_rules(user_id);
CREATE INDEX idx_automation_rules_enabled ON smart_automation_rules(enabled);
```

### 8. Smart Device Logs
```sql
CREATE TABLE smart_device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES smart_devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('command', 'status_change', 'alert', 'error', 'sync')),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_logs_device_id ON smart_device_logs(device_id);
CREATE INDEX idx_device_logs_created_at ON smart_device_logs(created_at);
```

### 9. Smart Alerts
```sql
CREATE TABLE smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES smart_devices(id) ON DELETE CASCADE,
  property_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  alert_type TEXT CHECK (alert_type IN ('security', 'device', 'system')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON smart_alerts(user_id);
CREATE INDEX idx_alerts_severity ON smart_alerts(severity);
CREATE INDEX idx_alerts_dismissed ON smart_alerts(dismissed);
```

## Running Migrations

### Option 1: Direct SQL in Supabase
1. Go to Supabase dashboard
2. SQL Editor
3. Copy-paste each table creation script
4. Click "Run"

### Option 2: Using Migration Files
```bash
# Create migration
supabase migration new create_agencies_table

# Apply migrations
supabase db push

# Pull schema changes
supabase db pull
```

### Option 3: Using Node.js Script
```javascript
import { supabase } from './lib/supabase'

const migration = `
  CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    ...
  )
`

const { error } = await supabase.rpc('sql', { query: migration })
```

## Row Level Security (RLS)

Enable security policies:

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can only see their own devices
CREATE POLICY "Users can view own devices"
  ON smart_devices FOR SELECT
  USING (auth.uid() = user_id);

-- Agency members can view agency data
CREATE POLICY "Agency members can view agency"
  ON agencies FOR SELECT
  USING (
    id IN (
      SELECT agency_id FROM agency_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

## Seed Data (Development)

```sql
-- Create test user
INSERT INTO user_profiles (id, email, display_name, role)
VALUES (
  'uuid-here',
  'test@example.com',
  'Test User',
  'user'
);

-- Create test agency
INSERT INTO agencies (user_id, company_name, license_number, email, phone, verification_status)
VALUES (
  'uuid-here',
  'Sunset Realty',
  'LIC-123456',
  'contact@sunsetrealty.com',
  '+1-555-0123',
  'verified'
);
```

## Backup & Recovery

### Automatic Backups
- Supabase: Daily backups (free tier)
- Retention: 7 days (free), 30 days (pro)

### Manual Backup
```bash
# Export
pg_dump -U postgres -h db-host -d dbname > backup.sql

# Restore
psql -U postgres -h db-host -d dbname < backup.sql
```

## Performance Optimization

1. **Add indexes** on frequently queried columns
2. **Use EXPLAIN** to analyze queries
3. **Monitor slow queries** in Supabase dashboard
4. **Archive old data** (device logs > 30 days)

```sql
-- Archive old logs
DELETE FROM smart_device_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```
