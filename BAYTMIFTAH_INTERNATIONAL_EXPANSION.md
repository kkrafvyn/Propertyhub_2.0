# BaytMiftah International Expansion Guide

**Purpose:** How BaytMiftah adapts to each country’s property, tax, payment, and compliance rules.

---

## Supported markets (12 jurisdictions)

| Code | Country/Region | Currency | Status |
|------|----------------|----------|--------|
| **GH** | Ghana | GHS | **Primary** — full module set |
| **NG** | Nigeria | NGN | Tax + tenancy rules; PayAngels |
| **KE** | Kenya | KES | VAT, WHT, M-Pesa rail |
| **ZA** | South Africa | ZAR | POPIA, Rental Housing Act |
| **US** | United States | USD | 1099, trust accounting, HOA, TransUnion, state overlays |
| **GB** | United Kingdom | GBP | AST, deposit protection, Right to Rent |
| **EU** | European Union | EUR | GDPR, MOSS/OSS VAT, PSD2 |
| **AE** | UAE | AED | Ejari, FTA VAT, emirate rules |
| **CA** | Canada | CAD | GST/HST, provincial tenancy |
| **AU** | Australia | AUD | State bond authorities, GST |
| **IN** | India | INR | GST, TDS on rent, Model Tenancy Act |
| **GLOBAL** | Fallback | USD | Generic rules when country unknown |

---

## Architecture

```
Property / Org / User
        ↓
resolveCountryContext()  ← organization_country_settings
        ↓
CountryRulePack (tax, payments, lease, screening, address)
        ↓
Engines: compliance · tax · payment routing · revenue fees
```

**Key files:**
- `src/lib/country-rules/` — rule packs and resolver
- `src/lib/country-rules.service.ts` — org settings (DB)
- `src/app/pages/workspace/InternationalRulesHub.tsx` — workspace UI
- `supabase/migrations/2026090311_international_country_rules.sql` — DB schema

## Payment strategy: PayAngels worldwide

**PayAngels is the single primary payment rail for every market.** Local compliance (tax, lease, screening) varies by country; checkout always routes through PayAngels in the local currency where supported.

| Layer | What varies by country | What stays global |
|-------|------------------------|-------------------|
| **Checkout** | Currency (GHS, USD, GBP, …) | PayAngels provider |
| **Compliance** | Tax, lease, disclosures | Platform fee engine |
| **Supplementary** | MoMo (GH), M-Pesa (KE), bank transfer | Optional add-ons only |

Supported PayAngels currencies: GHS, NGN, KES, ZAR, USD, GBP, EUR, CAD, AUD, AED, INR.

Implementation: `src/lib/country-rules/payangels-rails.ts`, `src/lib/payment-routing.service.ts`

**WhatsApp lease signing:** Tenants in linked groups can type `/bm 6` or `@BaytMiftah sign` to receive their pending `/sign/:token` URL. Outbound messages use `send-whatsapp` (simulated locally when Cloud API credentials are absent).

---

### Sub-national overlays (deepened)

Select a **state, province, emirate, or member state** in Workspace → International Markets. Overlays patch lease rules and tax rates on top of the national pack.

| Jurisdiction | Subdivisions | What overlays add |
|--------------|--------------|-------------------|
| **GH** | Greater Accra, Ashanti, Western, Central, Eastern, Northern | Act 220 rent control (Accra), regional tenancy |
| **KE** | Nairobi, Mombasa, Kisumu, Nakuru, Kiambu | County VAT notes, coastal tourism levy, WHT patches |
| **ZA** | Gauteng, Western Cape, KZN, Eastern Cape, Limpopo, Mpumalanga | Provincial tribunals, VAT/tourism tax patches |
| **GB** | England, Scotland, Wales, Northern Ireland | AST vs PRT, Rent Smart Wales, NI deposit scheme |
| **US** | 16 states (CA, NY, TX, FL, WA, IL, MA, CO, NJ, GA, AZ, NV, NC, VA, PA, OR) | Deposit caps, rent control flags, state sales tax on fees |
| **NG** | Lagos, FCT Abuja, Rivers, Ogun, Kano | Advance rent limits, state tenancy references |
| **CA** | ON, BC, QC, AB, MB, SK | Provincial HST/GST/PST rates, deposit rules |
| **AU** | NSW, VIC, QLD, WA, SA | Bond limits, state tenancy acts |
| **AE** | Dubai, Abu Dhabi, Sharjah, Ajman | Ejari/Tawtheeq, deposit caps, tourism levy |
| **EU** | DE, FR, IE, NL, ES, IT, PT, BE | Member-state VAT rates, localized tenancy law |
| **IN** | MH, DL, KA, TN, TG | State deposit caps, registration requirements |

Implementation: `src/lib/country-rules/subdivisions.ts`, `subdivision-resolver.ts` — merged by `resolveCountryContext()`. Consumer onboarding auto-maps city → subdivision (e.g. Lagos → LA, London → ENG).

### Property-level rules (per listing)

Each property stores optional `subdivision_code` (migration `2026090313`). Resolution priority:

1. **Property override** — manual or saved on create/edit listing
2. **Address auto-detect** — city/region → overlay code
3. **Organization default** — International Markets setting

| Surface | What it does |
|---------|----------------|
| **New / edit listing** | `PropertyJurisdictionFields` — region picker, lease highlights, currency |
| **Listing cards** | Market label badge (e.g. Lagos State, Greater Accra) |
| **Checkout** | `previewPropertyCheckoutPricing` — platform fee + statutory tax per property jurisdiction |
| **Property detail** | `ComplianceDisclosurePanel` + jurisdiction badge |
| **Compliance checklist** | Lease highlights from property subdivision |

Implementation: `src/lib/property-country-context.service.ts`, `src/lib/property-checkout-pricing.service.ts`

### Lease document auto-clauses (deepened)

Property jurisdiction drives **schedule generation** and **draft auditing** for every market — not only Ghana Act 220.

| Capability | Where | Behavior |
|------------|-------|----------|
| **Generate schedule** | Workspace → Leases | `PropertyLeaseClausePanel` — markdown schedule with mandatory clauses, deposit/advance caps, PayAngels payment line |
| **Multi-market audit** | Workspace → AI Lease Analyzer | Market preset selector; `analyzeLeaseForProperty()` uses Ghana engine for GH, statutory caps + required clauses elsewhere |
| **Per-lease context** | Lease property join | `lease.service` loads `country`, `subdivision_code` from listing property |

Implementation:
- `src/lib/lease-clause-generator.service.ts` — `generateLeaseSchedule()`, `downloadLeaseSchedule()`
- `src/lib/jurisdiction-lease-analyzer.service.ts` — deposit/advance cap checks, required clause detection, GH → Act 220 delegate
- `src/app/components/compliance/PropertyLeaseClausePanel.tsx`

**Admin revenue:** `RevenueDashboard` includes **Revenue by jurisdiction** — month transactions grouped by property subdivision via `buildPropertyComplianceSnapshot()`.

### Lease → e-signature flow (Phase 1)

| Step | Component |
|------|-----------|
| Pick template | `lease-template.service.ts` — residential / commercial / short-stay |
| Generate body | `lease-esignature.service.ts` — `prepareLeaseEnvelope()`, `sendLeaseForSigning()` |
| Store & sign | `esignature_requests.document_body` + public `/sign/:token` preview |
| Workspace | Leases → **Send for e-signature**; eSignature Hub → lease-linked auto-clauses |

See `LEASE_ESIGN_PLAN.md` for Phase 3 (commercial launch) details.

### Phase 3 — Commercial launch ✅

| Feature | Implementation |
|---------|----------------|
| **Counsel sign-off** | `jurisdiction-counsel-signoff.service.ts` — required before send (override available) |
| **50+ addenda** | Curated packs + `subdivision-addenda-auto.ts` fallback from all overlays |
| **Tenant notify** | In-app + email on send; nav badge count; `/app/sign/:token` deep link |
| **Revenue attribution** | `revenue_jurisdiction_events` + admin dashboard e-sign GMV by jurisdiction |
| **DocuSign** | `docusign-envelope.service.ts` builds envelope from `document_body` |

### Phase 4 — Reach & reminders ✅

| Feature | Implementation |
|---------|----------------|
| **SMS signing link** | `sendLeaseSigningSms` on envelope send when tenant phone on file |
| **44 curated addenda** | US states, NG regions, EU markets, GH/KE/ZA/GB expansions |
| **DocuSign API** | `create-docusign-envelope` edge — live envelope when credentials configured |
| **Auto reminders** | `automation-dispatcher` → `runLeaseEsignReminders` (24h delay, max 3, 2-day gap) |
| **Manual remind** | eSignature Hub → **Remind** button per pending envelope |

### Phase 2 — Archive, audit gate, addenda (expanded)

| Feature | Implementation |
|---------|----------------|
| **22 subdivision addenda** | `subdivision-clause-addenda.ts` — Ejari, AST, Lagos, AB 1482, Ontario SFL, … |
| **Audit gate (min 50/100)** | `lease-audit-gate.ts` — manager override in Leases + eSignature Hub |
| **Document Center archive** | Draft `lease_contract` on send → signed record when tenant completes `/sign/:token` |
| **Tenant portal** | Consumer leases → **Sign lease online** (pending envelope deep link) |
| **DocuSign hint** | Metadata envelope tab when `VITE_DOCUSIGN_INTEGRATION_KEY` configured |

---

### Ghana (GH)
- **Tax:** VAT 15%, NHIL 2.5%, GETFund 2.5%, GRA rent withholding 8%
- **Payments:** PayAngels (primary), MTN MoMo, GhIPSS (supplementary)
- **Lease:** Act 220 / Rent Control Act, advance rent caps
- **Address:** GhanaPostGPS validation
- **Modules:** Trust Center, gate kiosk, sub-metering, Act 220 AI analyzer

### United States (US)
- **Tax:** 1099-NEC contractor reporting (≥ $600); state sales tax on fees via overlay
- **Payments:** PayAngels (primary worldwide), bank transfer fallback
- **Lease:** Fair Housing, RESPA; **16 state overlays** (deposit caps, rent control, notice periods)
- **Screening:** TransUnion SmartMove (credit, criminal, eviction)
- **Modules:** 1099, HOA, CAM, trust accounting, commercial escalations

### Nigeria (NG)
- **Tax:** VAT 7.5%, WHT on rent 10%
- **Lease:** National defaults + **5 state overlays** (Lagos advance rent cap 6 months, FCT, Rivers, Ogun, Kano)
- **Payments:** PayAngels (primary), bank transfer

### Kenya (KE) / South Africa (ZA)
- **Tax:** VAT 16% / 15%, rent withholding where applicable
- **Payments:** PayAngels (primary), M-Pesa / EFT supplementary

### United Kingdom (GB)
- **Tax:** VAT 20% on fees (rent generally exempt)
- **Lease:** Tenant Fees Act, deposit protection, How to Rent guide
- **Payments:** PayAngels (primary), BACS supplementary

### EU / AE / CA / AU / IN
- See rule packs in `src/lib/country-rules/packs/index.ts` for statutory references, tax rates, and enabled modules.

---

## How to configure an organization

1. Workspace → **International Markets**
2. Select primary operating country and **sub-national region** (state, province, emirate, or EU member) where applicable
3. **Save as organization default**
4. Compliance Center, payments, and fee calculations use this jurisdiction

Org settings stored in `organization_country_settings`.

---

## Adding a new country

1. Add jurisdiction block to `real-estate-compliance.ts` (disclosures, regulators)
2. Create pack in `src/lib/country-rules/packs/index.ts`:
   - `taxProfile`, `paymentRails`, `leaseRules`, `addressFormat`, `enabledModules`
3. Register in `COUNTRY_PACKS`
4. Seed `jurisdiction_tax_profiles` migration row
5. Add `MARKET_PRESET` in `user-market.service.ts` for consumer onboarding
6. Add integration catalog entries with `supported_regions`

---

## Revenue & tax regionalization

- `revenue_rules.jurisdiction_id` — scope fees per market (`GLOBAL` = fallback)
- `jurisdiction_tax_profiles` — admin-readable tax component registry
- `calculateRevenueFee({ jurisdictionId })` — prefers jurisdiction-scoped rules

**Next steps for full commercial launch per country:**
- Local legal counsel sign-off on rule pack text
- PayAngels production credentials for all target currency corridors
- Localized legal policies in `src/content/legal/policies.ts`
- Consumer currency display driven by `MarketContext` + `currency-format.ts` (market currency; GHS/USD toggle for Ghana only)

---

## Workspace navigation

| Page | Path slug |
|------|-----------|
| International Markets | `international-rules` |
| Compliance Center | `compliance` (country selector) |
| Ghana Trust Center | `trust` (GH-specific) |
| 1099 / Trust / HOA | US module slugs |

---

*BaytMiftah REOS — one platform, market-aware rules.*
