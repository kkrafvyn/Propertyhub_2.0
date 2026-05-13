# Quick Start: Deploy Your Upgrades

Complete checklist to go live with all new features in the next 48 hours.

---

## ⏱️ 48-Hour Deployment Plan

### **Hour 1-2: Database Setup**

```bash
# 1. Backup current database
supabase db backup

# 2. Execute new migration
supabase db push
# OR manually go to Supabase → SQL Editor → Run: 
# supabase/migrations/003_international_and_mls_integration.sql

# 3. Verify tables created
# Check in Supabase console:
# - currency_rates ✓
# - mls_credentials ✓
# - external_listings ✓
# - listing_sync_jobs ✓
# - aggregated_leads ✓
# - fraud_alerts ✓
# - payment_transactions ✓
# - user_payment_methods ✓
```

### **Hour 2-3: Environment Configuration**

```bash
# 1. Update .env with new variables
cat >> .env << 'EOF'

# ===== CURRENCY & PAYMENTS =====
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...

# ===== MLS INTEGRATIONS =====
MLS_API_KEY=your_mls_key
MLS_API_SECRET=your_mls_secret
ZILLOW_API_KEY=your_zillow_key
REALTOR_API_KEY=your_realtor_key

# ===== EMAIL SERVICE =====
SENDGRID_API_KEY=SG_...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# ===== FEATURE FLAGS =====
VITE_FEATURE_MLS_SYNC=true
VITE_FEATURE_FRAUD_DETECTION=true
VITE_FEATURE_MULTI_CURRENCY=true
EOF

# 2. Get real credentials (see section below)
# 3. Update .env with actual values
# 4. DO NOT commit .env to git
# 5. Add to production secrets (Vercel/Railway/etc)
```

### **Hour 3-4: Get API Credentials**

**MLS Network:**
- ⏱️ **Time**: 1-2 hours
- **URL**: Contact your local MLS board
- **What you'll get**: API Key + Secret
- **Setup**: Add to MLS_API_KEY & MLS_API_SECRET

**Zillow:**
- ⏱️ **Time**: 30 minutes to 2 hours
- **URL**: https://www.zillow.com/api/
- **Process**:
  1. Click "Request API Access"
  2. Fill application form
  3. Verify email
  4. Get API key
- **Setup**: Add to ZILLOW_API_KEY

**Realtor.com:**
- ⏱️ **Time**: 30 minutes to 1 hour
- **URL**: https://api.realtor.com/
- **Process**:
  1. Sign up developer account
  2. Create new application
  3. Get API key from dashboard
- **Setup**: Add to REALTOR_API_KEY

**Stripe (Card Payments):**
- ⏱️ **Time**: 5 minutes
- **URL**: https://dashboard.stripe.com/
- **Process**:
  1. Sign in or create account
  2. Get Publishable Key & Secret Key
  3. Test mode keys for development
- **Setup**: Add to VITE_STRIPE_PUBLIC_KEY & STRIPE_SECRET_KEY

**Flutterwave (Mobile Money - Africa):**
- ⏱️ **Time**: 30 minutes
- **URL**: https://dashboard.flutterwave.com/
- **Process**:
  1. Sign up account
  2. Create Live Keys
  3. Copy Public Key & Secret Key
- **Setup**: Add to VITE_FLUTTERWAVE_PUBLIC_KEY & FLUTTERWAVE_SECRET_KEY

### **Hour 4-5: Update Routes & Navigation**

```typescript
// src/app/routes.tsx - Add these routes

{
  path: 'workspace/:organizationSlug/integration-hub',
  lazy: async () => {
    const { IntegrationHub } = await import('./pages/workspace/IntegrationHub')
    return { 
      Component: function ProtectedIntegrationHub() {
        return (
          <ProtectedRoute>
            <IntegrationHub organizationId={org.id} workspaceBasePath={basePath} />
          </ProtectedRoute>
        )
      }
    }
  }
},
{
  path: 'workspace/:organizationSlug/leads',
  lazy: async () => {
    const { LeadManagement } = await import('./pages/workspace/LeadManagement')
    return { 
      Component: function ProtectedLeads() {
        return (
          <ProtectedRoute>
            <LeadManagement organizationId={org.id} />
          </ProtectedRoute>
        )
      }
    }
  }
}
```

### **Hour 5-6: Update Workspace Navigation**

```typescript
// src/app/pages/workspace/WorkspaceLayout.tsx
// Add to navigation menu:

const menuItems = [
  // ... existing items ...
  {
    icon: Zap,
    label: 'Integration Hub',
    href: 'integration-hub',
    description: 'Connect MLS, Zillow, Realtor'
  },
  {
    icon: Users,
    label: 'Lead Management', 
    href: 'leads',
    description: 'Track & score all leads'
  },
  {
    icon: AlertCircle,
    label: 'Fraud Alerts',
    href: 'fraud-alerts', // TODO: Create this page
    description: 'Monitor scams & duplicates'
  }
]
```

### **Hour 6-7: Test Everything**

```bash
# 1. Start dev server
npm run dev

# 2. Test multi-currency
# Go to http://localhost:5173
# Check console:
window.currencyService.getSupportedCurrencies()
# Should return 16+ currencies

# 3. Test i18n
# Check console:
window.i18nService.getSupportedLanguages()
# Should return 12 languages

# 4. Test payments
# Go to new payment page
# Should show region-specific payment methods

# 5. Test MLS integration
# Go to /workspace/your-org/integration-hub
# Add MLS credentials (use test keys)
# Click "Sync Now"
# Should show sync job in table

# 6. Test lead aggregation
# Go to /workspace/your-org/leads
# Create test lead
# Check scoring works
```

### **Hour 7-8: Set Up Cron Jobs**

**Option A: Vercel Cron Jobs (if using Vercel)**

```typescript
// api/cron/sync-listings.ts
import { mlsIntegrationService } from '@/lib/mls-integration.service'
import { enhancedFraudDetectionService } from '@/lib/enhanced-fraud-detection.service'

export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get all organizations
    const orgs = await supabase
      .from('organizations')
      .select('id')
      .eq('is_active', true)

    for (const org of orgs.data || []) {
      // Sync each provider
      await mlsIntegrationService.syncListingsFromProvider(org.id, 'mls')
      await mlsIntegrationService.syncListingsFromProvider(org.id, 'zillow')
      await mlsIntegrationService.syncListingsFromProvider(org.id, 'realtor')
      
      // Run fraud scan
      await enhancedFraudDetectionService.runComprehensiveFraudScan(org.id)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Cron failed:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
```

**Option B: External Cron Service (EasyCron, Cron-job.org)**

```bash
# Set up daily cron job at 2 AM UTC
# URL: https://yourdomain.com/api/cron/sync-listings
# Header: Authorization: Bearer YOUR_CRON_SECRET
# Frequency: Daily
```

### **Hour 8: Deploy to Production**

```bash
# 1. Test build locally
npm run build
npm run preview

# 2. Commit changes
git add -A
git commit -m "feat: Add international support, MLS integration, and fraud detection"

# 3. Push to production branch
git push origin main

# 4. Deploy (Vercel/Railway/etc)
# Most platforms auto-deploy on git push

# 5. Verify production
# Go to https://yourapp.com/workspace/org-slug/integration-hub
# Should see Integration Hub page

# 6. Monitor logs
# Check for any errors in production logs
```

---

## 🧪 Manual Testing Checklist

- [ ] Database migration executed successfully
- [ ] All 8 new tables created
- [ ] Multi-currency service loads without errors
- [ ] i18n service supports all 12 languages
- [ ] Integration Hub page loads
- [ ] Can add MLS credentials (with test key)
- [ ] Can trigger manual sync
- [ ] Lead Management page loads
- [ ] Can create test lead
- [ ] Lead scoring works (0-100)
- [ ] Fraud detection scan completes
- [ ] Payment methods show for location
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Mobile responsive on tablet/phone

---

## 🚨 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "currency_rates not found" | Run migration: `supabase db push` |
| MLS sync fails | Verify API key format is correct |
| No leads showing | Check organization ID is correct |
| "RLS policy violation" | Ensure user is organization member |
| TypeScript errors | Run `npm run build` to check |
| Styles not loading | Clear browser cache, `npm run build` |

---

## 📱 Mobile Testing

Test on:
- [ ] iPhone 14+ (Safari)
- [ ] Android 12+ (Chrome)
- [ ] iPad (Landscape + Portrait)
- [ ] Desktop 1920x1080

**Focus on:**
- [ ] Integration Hub responsive
- [ ] Lead list mobile-friendly
- [ ] Forms work on small screens
- [ ] Buttons easily tappable

---

## 📊 Post-Launch Monitoring

**Week 1:**
- Monitor MLS sync success rate
- Check fraud alert accuracy
- Track lead aggregation quality
- Monitor payment processing

**Week 2:**
- Analyze conversion metrics
- Tune fraud detection rules
- Optimize sync frequency
- Gather user feedback

**Week 3:**
- Performance optimization
- Additional provider integrations?
- Advanced features?

---

## 🎯 Success Metrics

After deployment, track these:

```
MLS Integration:
- Listings synced per day: Target 100+
- Sync success rate: Target 98%+
- Sync time: Target <2 minutes

Lead Management:
- Leads aggregated: Monitor volume
- Duplicate leads detected: Monitor accuracy
- Lead quality score: Average should be 60+

Fraud Detection:
- Alerts per day: Depends on volume
- False positive rate: Target <5%
- Resolution time: Target <24 hours

Payments:
- Conversion rate: Target 3%+
- Average payment: Monitor by region
- Payment method usage: Analyze by country
```

---

## 📞 Getting Help

If something breaks:

1. **Check logs**
   ```bash
   # Vercel
   vercel logs
   
   # Supabase
   # Dashboard → Logs tab
   ```

2. **Check database**
   ```bash
   supabase db push --dry-run
   ```

3. **Test locally**
   ```bash
   npm run dev
   # Visit http://localhost:5173
   ```

4. **Reset if needed**
   ```bash
   supabase db reset
   supabase db push
   ```

---

## ✅ Launch Checklist

- [ ] Database migration complete
- [ ] Environment variables set
- [ ] API credentials obtained
- [ ] Routes added to router
- [ ] Navigation menu updated
- [ ] Cron jobs configured
- [ ] Tests passed locally
- [ ] Build succeeds (`npm run build`)
- [ ] Deployed to production
- [ ] Production verified working
- [ ] Monitoring set up
- [ ] Team trained on features
- [ ] Documentation shared

---

## 🎉 You're Done!

Your Property Hub is now:
✅ Global (16 currencies, 12 languages)
✅ Professional (MLS integration)
✅ Smart (Lead aggregation & scoring)
✅ Safe (Fraud detection)
✅ Ready for millions of users

**Estimated time to complete: 8-10 hours**

**Next features to build?** See [IMPLEMENTATION_COMPLETE.md](../implementation/IMPLEMENTATION_COMPLETE.md) for ideas.

---

**Questions?** Check [INTERNATIONAL_MLS_SETUP.md](../setup/INTERNATIONAL_MLS_SETUP.md) for detailed docs.

