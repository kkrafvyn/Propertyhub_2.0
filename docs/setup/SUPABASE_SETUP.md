# Property Hub REOS - Supabase Setup Guide

## Initial Setup

### 1. Environment Variables
Your `.env` file already has Supabase credentials:
```
VITE_SUPABASE_URL=https://paobdnhpjmqsovideexo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_uz2wzAcMRyvTGAXcA42t9w_qglh1xFo
```

### 2. Create Database Schema

Go to your Supabase project dashboard:
1. Navigate to SQL Editor
2. Create a new query
3. Copy the entire contents of `supabase/migrations/001_create_schema.sql`
4. Run the query

This creates all 11 tables with proper indexes:
- `users` - User profiles
- `organizations` - Agencies/companies
- `organization_members` - Team members with roles
- `properties` - Physical properties
- `listings` - Market-facing listings
- `deal_cases` - Rental/lease/purchase applications
- `saved_properties` - Bookmarked listings
- `conversations` - Chat threads
- `messages` - Chat messages
- `transactions` - Payment records
- `audit_logs` - Admin activity logs

### 3. Enable Row Level Security (RLS)

1. In SQL Editor, create another query
2. Copy contents of `supabase/migrations/002_rls_policies.sql`
3. Run the query

This enforces data isolation:
- Users can only see verified organizations
- Organization members can only access their org's data
- Public listings are visible to anyone
- Private deal cases are isolated by organization

### 4. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Database Schema Overview

### Users
- Manages user profiles linked to Supabase Auth
- Fields: email, full_name, phone, avatar_url, bio, verified, banned

### Organizations
- Represents agencies, landlord businesses, or property companies
- Fields: name, slug, description, logo_url, banner_url, website, owner_id, verified, suspended

### Properties & Listings
- `properties` = physical assets (address, amenities, etc.)
- `listings` = market-facing entries (price, status, visibility)
- Separation allows multiple listings per property (rent/sale/lease)

### Deal Cases
- Unified workflow for: rental_application, lease_application, purchase_offer
- Tracks status: pending → approved/rejected → closed
- Can be assigned to team members

### Messaging
- `conversations` table = 1:1 chats
- `messages` table = messages within conversations
- Supports realtime updates via Supabase

### Transactions & Audit
- `transactions` = payment/subscription records
- `audit_logs` = admin actions for compliance

---

## API Services Available

All services are in `src/lib/`:

```typescript
// Authentication
import { authService } from '@/lib/auth.service'
authService.signUp(email, password, fullName)
authService.signIn(email, password)
authService.signOut()
authService.resetPassword(email)

// Listings
import { listingService } from '@/lib/listing.service'
listingService.getPublicListings(limit, offset)
listingService.searchListings(filters, limit, offset)
listingService.getListingById(id)
listingService.createListing(data)

// Organizations
import { organizationService } from '@/lib/organization.service'
organizationService.getOrganizationBySlug(slug)
organizationService.getUserOrganizations(userId)
organizationService.createOrganization(org)
organizationService.getOrganizationMembers(orgId)

// Users
import { userService } from '@/lib/user.service'
userService.getUserById(id)
userService.updateUser(id, updates)

// Deal Cases
import { dealCaseService } from '@/lib/dealcase.service'
dealCaseService.createDealCase(data)
dealCaseService.getDealCasesByUser(userId)
dealCaseService.approveDealCase(id)

// Messaging
import { messageService } from '@/lib/message.service'
messageService.getConversation(conversationId)
messageService.sendMessage(conversationId, senderId, content)
messageService.subscribeToConversation(conversationId, callback)

// Saved Properties
import { savedPropertyService } from '@/lib/savedproperty.service'
savedPropertyService.getSavedProperties(userId)
savedPropertyService.toggleSavedProperty(userId, listingId)
```

---

## Authentication Flow

The app uses Supabase Auth with a React Context:

```typescript
import { useAuth } from '@/app/context/AuthContext'

export function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" />

  return <div>Logged in as {user.email}</div>
}
```

Protected routes automatically redirect unauthenticated users to `/login`.

---

## Storage Buckets

To enable file uploads (images, documents), create these buckets in Supabase:

1. Go to Storage
2. Create new bucket (public):
   - `organization-assets` - logos, banners
   - `property-media` - property images
   - `verification-documents` - KYC docs
   - `agreements` - contracts, lease agreements
   - `receipts` - transaction receipts

Set bucket policies to allow authenticated users to upload.

---

## Testing

### Create Test Organization
1. Sign up a new account
2. Go to `/workspace/new` to create organization
3. Listings will appear on home page and search

### Test Listings
Create properties via workspace → add listings → publish
Appears on `/search` and featured on home page

### Test Messaging
Two users can start conversations from property detail page

---

## Deployment Checklist

Before production:
- [ ] Configure Supabase custom domain (remove `.co` domain)
- [ ] Enable email verification for signups
- [ ] Set password requirements
- [ ] Configure email templates
- [ ] Create admin role and policies
- [ ] Set up payment processor (Paystack integration)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS
- [ ] Set up automated backups
- [ ] Test RLS policies thoroughly
- [ ] Configure rate limiting
- [ ] Set up monitoring & logging

---

## Common Issues

### "Missing environment variables"
Ensure `.env` file has both:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### "User not found"
RLS policies prevent cross-organization access. Ensure user is org member.

### "Invalid user token"
Token expired. Use `authService.getSession()` to refresh.

### Realtime not working
Enable Realtime in Supabase dashboard → Project Settings → Realtime
