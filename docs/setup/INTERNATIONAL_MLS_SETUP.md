# Multi-Currency, International, and MLS Integration Guide

Complete guide to setting up international payment support, MLS integrations, and fraud detection for your BaytMiftah REOS platform.

---

## 📋 Table of Contents

1. [Multi-Currency & International Support](#multi-currency--international-support)
2. [MLS/Zillow/Realtor Integration](#mlszillowrealtor-integration)
3. [Lead Aggregation & Management](#lead-aggregation--management)
4. [Fraud Detection & Anti-Scam](#fraud-detection--anti-scam)
5. [API Integration Steps](#api-integration-steps)
6. [Troubleshooting](#troubleshooting)

---

## Multi-Currency & International Support

### 1. Currency Service

The `currencyService` handles exchange rate conversions and formatting.

**Supported Currencies:**
- USD, EUR, GBP (major)
- GHS, NGN, ZAR, KES (Africa)
- JPY, INR, SGD (Asia)
- AUD, CAD, HKD, AED, SAR, and more

**Usage:**

```typescript
import { currencyService } from '@/lib/currency.service'

// Get all supported currencies
const currencies = currencyService.getSupportedCurrencies()

// Convert amount
const eurAmount = await currencyService.convertCurrency(1000, 'USD', 'EUR')
// Result: ~920

// Format currency
const formatted = currencyService.formatCurrency(1000, 'USD', 'en-US')
// Result: "$1,000"

// Get currencies by region
const ghanaianCurrencies = currencyService.getCurrenciesByRegion('GH')
// Result: [{ code: 'GHS', name: 'Ghana Cedi', symbol: '₵', ... }]
```

### 2. Internationalization (i18n)

The `i18nService` provides multi-language support and locale formatting.

**Supported Languages:**
English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese, Arabic, Hindi, Swahili, Yoruba

**Usage:**

```typescript
import { i18nService } from '@/lib/i18n.service'

// Set language
i18nService.setLanguage('es') // Spanish

// Translate key
const text = i18nService.t('properties.price') // "Precio"

// With parameters
const welcome = i18nService.t('common.welcome', { name: 'Juan' })

// Format date by language
const date = i18nService.formatDate(new Date())
// Respects language's date format

// Format number
const number = i18nService.formatNumber(1234.56)
// "1.234,56" in Spanish

// Initialize from browser language
i18nService.initializeFromBrowser()
```

### 3. International Payments

The `internationalPaymentService` handles multi-region payment methods.

**Supported Payment Methods by Region:**

| Region | Methods |
|--------|---------|
| **US** | Card (Stripe/PayPal), Apple Pay, Google Pay, Crypto |
| **EU** | Card, Bank Transfer (Wise), Klarna |
| **Africa (GH/NG/ZA/KE)** | Mobile Money (MTN, Airtel, M-Pesa), Flutterwave, Card |
| **UK** | Card, Bank Transfer, Klarna |
| **Asia** | Card, Bank Transfer, Wallets |

**Usage:**

```typescript
import { internationalPaymentService } from '@/lib/international-payment.service'

// Get available payment methods for user's location
const methods = internationalPaymentService.getPaymentMethods('GHS', 'GH')
// Result: [{ id: 'flutterwave', name: 'Flutterwave', ... }]

// Get payment configuration
const config = internationalPaymentService.getPaymentConfig('USD', 'US')
// Result: { currency, region, availableMethods, defaultMethod }

// Calculate payment fees
const fees = internationalPaymentService.calculateFees(1000, 'stripe')
// Result: { subtotal: 1000, fee: 29, total: 1029 }

// Save payment method for future use
await internationalPaymentService.savePaymentMethod(userId, 'stripe', {
  lastFour: '4242',
  brand: 'visa'
})

// Create transaction
const transaction = await internationalPaymentService.createTransaction(
  userId,
  1000,
  'GHS',
  'flutterwave',
  'mobile_money'
)
```

**Setup Instructions:**

1. Configure payment providers in `src/lib/international-payment.service.ts`
2. For Stripe: Add keys to `.env`
   ```
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. For Flutterwave (Africa): Add to `.env`
   ```
   VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
   ```
4. For M-Pesa (Kenya): Add credentials
5. Execute migration: `supabase/migrations/003_international_and_mls_integration.sql`

---

## MLS/Zillow/Realtor Integration

### 1. MLS Integration Service

The `mlsIntegrationService` handles connections to listing APIs.

**Features:**
- Store encrypted API credentials
- Auto-sync listings from MLS, Zillow, Realtor
- Track sync history and results
- Deduplicate listings across platforms

**Setup Steps:**

#### Step 1: Get API Credentials

**MLS (National Association of Realtors):**
1. Visit: https://rets-gateway.realogy.com/
2. Request RETS API access
3. Get your API Key and Secret
4. Note: Different MLS boards use different providers

**Zillow:**
1. Visit: https://www.zillow.com/api/
2. Request API access (may require verification)
3. Get your API Key
4. API Docs: https://www.zillow.com/api/docs

**Realtor.com:**
1. Visit: https://api.realtor.com/
2. Sign up for developer account
3. Get your API Key
4. Complete API docs available

#### Step 2: Store Credentials

```typescript
import { mlsIntegrationService } from '@/lib/mls-integration.service'

// Save MLS credentials
await mlsIntegrationService.saveMLSCredentials(
  organizationId,
  'mls',
  {
    apiKey: 'your_mls_api_key',
    apiSecret: 'your_mls_api_secret',
    syncFrequency: 'daily'
  }
)

// Save Zillow credentials
await mlsIntegrationService.saveMLSCredentials(
  organizationId,
  'zillow',
  {
    apiKey: 'your_zillow_api_key',
    syncFrequency: 'daily'
  }
)

// Save Realtor.com credentials
await mlsIntegrationService.saveMLSCredentials(
  organizationId,
  'realtor',
  {
    apiKey: 'your_realtor_api_key',
    syncFrequency: 'daily'
  }
)
```

#### Step 3: Sync Listings

```typescript
// Manual sync
const job = await mlsIntegrationService.syncListingsFromProvider(
  organizationId,
  'mls'
)
// Result: { id, status: 'completed', listingsSync: 45, listingsFailed: 2 }

// Get sync history
const history = await mlsIntegrationService.getSyncHistory(organizationId)

// Get synced listings
const listings = await mlsIntegrationService.getExternalListings(organizationId)

// Link external listing to internal listing (deduplication)
await mlsIntegrationService.linkExternalListing(externalListingId, internalListingId)
```

#### Step 4: Setup Automated Sync

Add to cron job or scheduled task:

```typescript
// Every day at 2 AM UTC
import cron from 'node-cron'

cron.schedule('0 2 * * *', async () => {
  const orgs = await getOrganizations() // Get all orgs
  
  for (const org of orgs) {
    // Sync all providers
    await mlsIntegrationService.syncListingsFromProvider(org.id, 'mls')
    await mlsIntegrationService.syncListingsFromProvider(org.id, 'zillow')
    await mlsIntegrationService.syncListingsFromProvider(org.id, 'realtor')
    
    // Run fraud detection
    await enhancedFraudDetectionService.runComprehensiveFraudScan(org.id)
  }
})
```

---

## Lead Aggregation & Management

### Overview

The lead aggregation system collects inquiries from:
- MLS integrations
- Zillow listings
- Realtor.com
- Internal website
- Direct inquiries
- Referrals

Automatically scores and deduplicates leads.

### Usage

```typescript
import { leadAggregationService } from '@/lib/lead-aggregation.service'

// Create a new lead
const lead = await leadAggregationService.createLead(
  organizationId,
  listingId,
  {
    source: 'website',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0100',
    message: 'Interested in viewing this property',
    requestedTimeframe: 'immediate',
    interestedPrice: 250000,
    tags: ['urgent', 'cash-buyer']
  }
)

// Get leads with filters
const leads = await leadAggregationService.getLeads(
  organizationId,
  {
    status: 'new',
    source: 'mls',
    minScore: 70,
    sortBy: 'leadScore'
  },
  50, // limit
  0   // offset
)

// Find duplicate leads
const duplicates = await leadAggregationService.findDuplicates(organizationId)
// Detects same person inquiring multiple times

// Merge duplicates
await leadAggregationService.mergeDuplicates(primaryLeadId, duplicateLeadId)

// Assign to agent
await leadAggregationService.assignLeadToAgent(leadId, agentId)

// Get trending leads (last 24 hours)
const trending = await leadAggregationService.getLeadsTrending(organizationId, 24)

// Get lead analytics by source
const analytics = await leadAggregationService.getLeadAnalyticsBySource(organizationId)
// Result: [
//   { source: 'mls', totalLeads: 45, convertedLeads: 12, conversionRate: 0.267 },
//   { source: 'zillow', totalLeads: 30, convertedLeads: 5, conversionRate: 0.167 },
//   ...
// ]

// Send automated follow-up
await leadAggregationService.sendFollowUp(
  leadId,
  'Thank you for your interest! We can schedule a viewing at your convenience.'
)
```

### Lead Scoring Algorithm

Each lead gets two scores:

**Quality Score (0-100):**
- Name provided: +25
- Valid email: +25
- Valid phone: +25
- Message included: +25

**Lead Score (0-100):**
- Base: 50
- Has email: +10
- Has phone: +10
- Message > 50 chars: +5
- Immediate timeframe: +15
- Soon timeframe: +10
- Price specified: +10
- Previous buyer history: +20
- Previously qualified: +10

---

## Fraud Detection & Anti-Scam

### Features

The `enhancedFraudDetectionService` automatically detects:

1. **Duplicate Listings** - Same property listed on multiple platforms
2. **Suspicious Leads** - Fake contact info, mass inquiries
3. **Price Mismatches** - Same property with different prices
4. **Image Reuse** - Copied photos from other listings
5. **Scam Patterns** - Bait-and-switch, fake listings

### Usage

```typescript
import { enhancedFraudDetectionService } from '@/lib/enhanced-fraud-detection.service'

// Run comprehensive fraud scan
const results = await enhancedFraudDetectionService.runComprehensiveFraudScan(
  organizationId
)
// Result: {
//   duplicateListings: 3,
//   suspiciousLeads: 7,
//   imageIssues: 2,
//   totalAlertsCreated: 12,
//   scanCompletedAt: '2026-05-13T...'
// }

// Get fraud alerts
const alerts = await enhancedFraudDetectionService.getFraudAlerts(
  organizationId,
  {
    severity: 'high', // 'low' | 'medium' | 'high' | 'critical'
    status: 'active'   // 'active' | 'investigating' | 'resolved' | 'dismissed'
  }
)

// Update alert status
await enhancedFraudDetectionService.updateAlertStatus(
  alertId,
  'investigating'
)

// Detect duplicates specifically
const duplicates = await enhancedFraudDetectionService.detectDuplicateListings(
  organizationId
)

// Detect suspicious leads specifically
const suspicious = await enhancedFraudDetectionService.detectSuspiciousLeads(
  organizationId
)
```

### Fraud Detection Rules

**Fake Email Detection:**
- @test., @example., @fake., @temp.
- Numbers only before @
- Common test patterns (aaa@, bbb@)

**Fake Phone Detection:**
- 555 area code (US)
- 000 or 999 patterns
- All same digit (1111111111)

**Mass Inquiry Detection:**
- 5+ inquiries from same email in 24 hours

**Duplicate Listing Detection:**
- Address match: 40% similarity weight
- City/State match: 25%
- Price within 5%: 20%
- Bedroom/bathroom match: 15%
- Location within 1km: 10%

**Threshold:** >85% = Duplicate, >95% = Critical Alert

---

## API Integration Steps

### 1. Update Routes

Add to `src/app/routes.tsx`:

```typescript
{
  path: 'workspace/:organizationSlug/integration-hub',
  lazy: async () => {
    const { IntegrationHub } = await import('./pages/workspace/IntegrationHub')
    return { Component: IntegrationHub }
  }
},
{
  path: 'workspace/:organizationSlug/leads',
  lazy: async () => {
    const { LeadManagement } = await import('./pages/workspace/LeadManagement')
    return { Component: LeadManagement }
  }
}
```

### 2. Update WorkspaceLayout Navigation

Add to sidebar menu:

```typescript
{
  icon: Zap,
  label: 'Integration Hub',
  href: 'integration-hub'
},
{
  icon: Users,
  label: 'Lead Management',
  href: 'leads'
}
```

### 3. Execute Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manual: Go to Supabase SQL Editor
# Run: supabase/migrations/003_international_and_mls_integration.sql
```

### 4. Test Each Integration

```bash
# Test multi-currency
npm run test -- currency.service

# Test i18n
npm run test -- i18n.service

# Test MLS sync
npm run test -- mls-integration.service

# Test fraud detection
npm run test -- enhanced-fraud-detection.service
```

---

## Environment Variables

Add to `.env`:

```env
# Currency & Payments
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...

# MLS & Property APIs
MLS_API_KEY=your_mls_key
MLS_API_SECRET=your_mls_secret
ZILLOW_API_KEY=your_zillow_key
REALTOR_API_KEY=your_realtor_key

# Optional: Email service for follow-ups
SENDGRID_API_KEY=SG_...
SENDGRID_FROM_EMAIL=noreply@baytmiftah.com

# Feature Flags
VITE_FEATURE_MLS_SYNC=true
VITE_FEATURE_FRAUD_DETECTION=true
VITE_FEATURE_MULTI_CURRENCY=true
```

---

## Troubleshooting

### Currency Conversion Returns 1

- **Issue**: Exchange rates not cached
- **Solution**: System will use default fallback rates until external API is configured
- Integrate with exchangerate-api.com or fixer.io

### MLS Sync Fails

- **Issue**: Invalid API credentials
- **Solution**: Verify credentials in Supabase → mls_credentials table
- Check API key format matches provider requirements

### Leads Not Being Aggregated

- **Issue**: Sync jobs not completing
- **Solution**: Check listing_sync_jobs table for error messages
- Verify organization has valid MLS integration

### Fraud Alerts Not Appearing

- **Issue**: Scan not running
- **Solution**: Manually trigger: `enhancedFraudDetectionService.runComprehensiveFraudScan(orgId)`
- Set up cron job for automated daily scans

### International Payments Not Showing

- **Issue**: Payment provider not configured for region
- **Solution**: Add provider to PAYMENT_PROVIDERS in international-payment.service.ts
- Verify supported regions and currencies

---

## Security Notes

✅ **Best Practices:**
- API keys encrypted in Supabase
- RLS policies enforce org-level access
- Audit logging of all fraud alerts
- PCI compliance for payment methods (never store full card numbers)

⚠️ **Before Production:**
1. Use Supabase vault for sensitive API keys
2. Enable field-level encryption for credentials
3. Implement rate limiting on API endpoints
4. Add webhook signature verification for MLS updates
5. Regular security audits of fraud detection rules

---

## Next Steps

1. ✅ Execute database migration
2. ✅ Get API credentials from providers
3. ✅ Test each service locally
4. ✅ Deploy fraud detection cron job
5. ✅ Configure payment providers
6. ✅ Set up email notifications for leads
7. ✅ Monitor fraud alerts dashboard

**Estimated Setup Time:** 4-6 hours

**Questions?** Check Supabase docs at https://supabase.com/docs

