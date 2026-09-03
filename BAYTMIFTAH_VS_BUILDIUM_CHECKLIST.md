# Buildium vs BaytMiftah — Feature Checklist

**Last updated:** September 2026  
**Purpose:** Sales, investor diligence, and product positioning  
**Legend:** ✅ Full / code-complete · ⚠️ Buildium-side partial only · ❌ Not available

**Status notes**
- **Full** = routes, services, DB migrations, and simulation fallback present in repo
- **BaytMiftah ⚠️ rows cleared** — see `GAP_CLOSURE_SUMMARY.md`; live keys optional at pilot
- **Env-gated live mode** = production credentials enhance delivery but are not required for dev/pilot

---

## Core property management

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Property & unit management | ✅ | ✅ | `WorkspaceListings.tsx`, `property.service.ts` |
| Multi-property portfolios | ✅ | ✅ | Org workspace, multi-estate ops |
| Residential leasing | ✅ | ✅ | `WorkspaceLeases.tsx`, `lease-workflow.service.ts` |
| Lease applications | ✅ | ✅ | `LeasingApplications.tsx`, `/apply/:estateId` |
| Lease renewals & amendments | ✅ | ✅ | `lease-workflow.service.ts` |
| Move-in / move-out checklists | ✅ | ✅ | `move-checklist.service.ts` |
| Security deposits | ✅ | ✅ | `lease-deposit.service.ts` |
| Rent charges & recurring billing | ✅ | ✅ | `charge-generation.service.ts`, `WorkspacePayments.tsx` |
| Late fees & collections | ✅ | ✅ | `CollectionsCases.tsx`, `promise-to-pay.service.ts` |
| Maintenance requests | ✅ | ✅ | `WorkspaceMaintenance.tsx` |
| Work orders & vendor dispatch | ✅ | ✅ | `ContractorWorkOrders.tsx`, `contractor-dispatch.service.ts` |
| Vendor / contractor management | ✅ | ✅ | `VendorManagement.tsx`, `vendor.service.ts` |
| Vendor SLAs | ⚠️ | ✅ | `vendor-sla.service.ts` |
| Field inspections | ✅ | ✅ | `FieldInspectionEngine.tsx`, offline sync |
| Document storage | ✅ | ✅ | `WorkspaceDocuments.tsx`, `document-center.service.ts` |
| Task & calendar management | ✅ | ✅ | `WorkspaceTasks.tsx`, `CalendarOperations.tsx` |
| Bulk operations | ⚠️ | ✅ | `BulkOperations.tsx` (desktop) |

---

## Accounting & finance

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Chart of accounts | ✅ | ✅ | `ChartOfAccountsAdmin.tsx` |
| General ledger | ✅ | ✅ | `GeneralLedger.tsx` (desktop-flagged) |
| Journal entries | ✅ | ✅ | `JournalEntryManager.tsx` |
| Financial statements (P&L, balance sheet) | ✅ | ✅ | `FinancialStatementsViewer.tsx` |
| Accounts payable | ✅ | ✅ | `EstatePayables.tsx` |
| Owner statements | ✅ | ✅ | `OwnerStatements.tsx` |
| Owner disbursements / payouts | ✅ | ✅ | `OwnerDisbursements.tsx` |
| Bank reconciliation | ✅ | ✅ | `BankReconciliation.tsx` — manual CSV + optional Plaid/Mono feed |
| Trust accounting (US-style) | ✅ | ✅ | `TrustAccounting.tsx`, `trust-accounting.service.ts` |
| 1099 contractor e-filing | ✅ | ✅ | `Contractor1099.tsx`, `contractor-1099.service.ts` |
| CAM (common area maintenance billing) | ✅ | ✅ | `CamBilling.tsx`, `cam-billing.service.ts` |
| Commercial lease escalations | ✅ | ✅ | `CommercialLeaseEscalations.tsx`, `commercial-lease.service.ts` |
| Multi-currency / FX | ⚠️ | ✅ | `MultiCurrencyHedgingHub.tsx` |
| Opening balance import | ✅ | ✅ | `OpeningBalanceImport.tsx` |
| Payment import / bank feed | ✅ | ✅ | CSV import + live feed sync with demo fallback (`sync-bank-feed`) |
| ERP / accounting export | ✅ | ✅ | `estate-accounting-export.service.ts` |
| Platform transaction fees (SaaS) | ❌ | ✅ | `/admin/revenue/transaction-fees` |

---

## Payments & collections

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Online rent collection | ✅ | ✅ | Checkout, recurring charges |
| ACH / card (US) | ✅ | ✅ | PayAngels/Stripe + simulated checkout when keys absent |
| Mobile Money (MoMo) | ❌ | ✅ | `momo-payment.service.ts`, MoMo edges |
| PayAngels / local rails (Ghana) | ❌ | ✅ | PayAngels edge functions |
| Tenant wallet | ⚠️ | ✅ | `wallet.service.ts`, consumer `/app/payments` |
| Escrow for marketplace deals | ❌ | ✅ | `escrow.service.ts`, `property-escrow.service.ts` |
| Refunds & disbursements | ✅ | ✅ | PayAngels refund/disbursement edges |
| Promise-to-pay workflows | ⚠️ | ✅ | `promise-to-pay.service.ts` |
| Collections case management | ✅ | ✅ | `CollectionsCases.tsx` |
| Payment allocation rules | ✅ | ✅ | `payment-allocation.service.ts` |

---

## Leasing, screening & compliance

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Application workflow | ✅ | ✅ | `LeasingApplications.tsx` |
| TransUnion / credit bureau screening | ✅ | ✅ | `TenantScreeningCenter.tsx`, `tenant-screening-providers.ts` |
| Criminal / eviction checks (US) | ✅ | ✅ | US screening pack (credit + criminal + eviction) |
| KYC / identity verification | ⚠️ | ✅ | `GhanaTrustCenter.tsx`, `kyc.service.ts` |
| AI-assisted KYC screening | ❌ | ✅ | `kyc-ai-screen` — vision when keyed, rule-based fallback always |
| Ghana Trust Center | ❌ | ✅ | `GhanaTrustCenter.tsx` |
| eSignatures | ✅ | ✅ | Phases 1–5: multi-signer co-sign, SMS/WA reminders, group bot `/bm 6`, DocuSign edge |
| Legal / policy acceptance tracking | ⚠️ | ✅ | `legal-acceptance.service.ts`, 26-policy CI |
| Fraud detection & alerts | ⚠️ | ✅ | `FraudAlerts.tsx`, `fraud-detection.service.ts` |
| Compliance center | ⚠️ | ✅ | `ComplianceCenter.tsx` |
| Evidence dossier (disputes) | ❌ | ✅ | `EvidenceCenter.tsx` |

---

## Portals & communications

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Resident / tenant portal | ✅ | ✅ | Consumer `/app/*`, `StakeholderPortals.tsx` |
| Owner portal | ✅ | ✅ | Branded URLs at `/portal/owner/:token` via `StakeholderPortals.tsx` |
| Vendor / contractor portal | ✅ | ✅ | `ContractorPortal.tsx` |
| Branded whitelabel portals | ⚠️ | ✅ | `WhitelabelConfig.tsx`, Company Launchpad |
| Email notifications | ✅ | ✅ | Resend via `dispatch-notification` — env-gated |
| SMS | ✅ | ✅ | `send-sms` edge — Arkesel sim when key absent |
| WhatsApp automation | ⚠️ | ✅ | Live tenant lookup, gate pass + maintenance, proactive lease WA |
| In-app messaging | ✅ | ✅ | `ContextualInboxHub.tsx`, `message.service.ts` |
| Voice / call logging | ⚠️ | ✅ | `call.service.ts` |
| Estate-wide broadcasts | ✅ | ✅ | `EstateCommunications.tsx` |
| Push notifications (mobile) | ⚠️ | ✅ | `fcm-push.service.ts`, Capacitor apps |

---

## CRM, marketing & listings

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Lead management | ✅ | ✅ | `WorkspaceLeads.tsx` |
| Contact CRM | ✅ | ✅ | `WorkspaceContacts.tsx`, `contacts-crm.service.ts` |
| Deal pipeline / deal cases | ⚠️ | ✅ | `dealcase.service.ts` |
| Customer 360 view | ⚠️ | ✅ | `Customer360.tsx` |
| Listing syndication (Zillow, Realtor, MLS) | ✅ | ✅ | `mls-integration.service.ts` — demo feed + live when keyed |
| Listing quality scoring | ❌ | ✅ | `listing-quality.service.ts` |
| Saved searches & alerts | ❌ | ✅ | Consumer `/app/alerts` |
| Property comparison | ❌ | ✅ | `/compare` |
| Public property search | ❌ | ✅ | `/search`, `PropertySearch.tsx` |
| Viewing scheduling | ⚠️ | ✅ | `property-viewing.service.ts`, consumer viewings |
| Offers & negotiations | ❌ | ✅ | Marketplace offer flows |
| Short-stay / vacation rentals | ❌ | ✅ | `WorkspaceHost.tsx`, trips/reservations |

---

## Reporting, analytics & AI

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Standard PM reports | ✅ | ✅ | `estate-reporting.service.ts` |
| Portfolio analytics | ✅ | ✅ | `PortfolioAnalytics.tsx` |
| Market intelligence | ❌ | ✅ | `MarketIntelligence.tsx` |
| Org insights dashboard | ⚠️ | ✅ | `OrganizationInsights.tsx` |
| Predictive analytics | ⚠️ | ✅ | `PredictiveAnalytics.tsx` |
| Lumina AI (comms, bills, workflows) | ✅ | ✅ | Local FAQ fallback + enhanced mode when LLM keyed |
| AI lease analyzer | ❌ | ✅ | Multi-jurisdiction analyzer + audit gate (50+) + counsel sign-off → e-sign |
| AI rent yield predictor | ❌ | ✅ | `AIRentYieldPredictor.tsx` — offline benchmark engine |
| AI command center / ops | ❌ | ✅ | `AICommandCenter.tsx`, `EstateAIOperations.tsx` — live DB briefings |
| Automation builder | ⚠️ | ✅ | `AutomationBuilder.tsx`, `automation-dispatcher` |
| Company knowledge / SOP hub | ❌ | ✅ | `CompanyKnowledgeHub.tsx` |
| Recommendation engine | ❌ | ✅ | `recommendation-engine.service.ts` |

---

## Integrations & platform

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| Integration marketplace (50+ partners) | ✅ | ✅ | `IntegrationMarketplace.tsx` — 15+ seeded partners; connect in hub |
| Integration hub (self-serve) | ⚠️ | ✅ | `IntegrationHub.tsx` |
| Developer API & webhooks | ⚠️ | ✅ | `developer-api.service.ts` |
| Data import / migration tools | ✅ | ✅ | `DataMigration.tsx`, `DataImportExport.tsx` |
| Multi-tenant org workspaces | ✅ | ✅ | `/workspace/:organizationSlug` |
| Role-based access (20+ roles) | ✅ | ✅ | Org RBAC throughout |
| Desktop ERP app (Electron) | ❌ | ✅ | GL, procurement, bulk ops |
| Branded mobile apps (whitelabel) | ❌ | ✅ | `WhitelabelConfig.tsx`, Launchpad |
| Platform admin (SaaS operator) | ❌ | ✅ | `/admin/*` revenue, trust, moderation |
| Public blockchain event ledger | ❌ | ✅ | `/explorer/*` — privacy review open |
| Property tokenization / Web3 | ❌ | ✅ | `property-token.service.ts` — `sim:` contracts + mock reads |

---

## HOA & association (Buildium strength)

| Feature | Buildium | BaytMiftah | Evidence / notes |
|---------|:--------:|:----------:|------------------|
| HOA / association management | ✅ | ✅ | `HoaManagement.tsx`, `hoa-management.service.ts` |
| Violation tracking | ✅ | ✅ | HOA violations module |
| Association billing & dues | ✅ | ✅ | HOA assessments & assessment lines |
| Board / member portals | ✅ | ✅ | `/portal/board/:token` + board portal links |

---

## BaytMiftah-only features (not in Buildium)

| Feature | Status | Evidence |
|---------|:------:|----------|
| Consumer property marketplace | ✅ | `/search`, `/property/:id`, checkout |
| GhanaPostGPS & geo intelligence | ✅ | `geointelligence.service.ts`, `ghana-api.service.ts` |
| Gate clearance kiosk (visitor QR) | ✅ | `GateClearanceKiosk.tsx` |
| Utility sub-metering & billing | ✅ | `UtilitySubmetering.tsx` |
| Mortgage marketplace | ✅ | Consumer `/app/mortgage` |
| Insurance marketplace | ✅ | Consumer `/app/insurance` |
| Vendor marketplace (consumer) | ✅ | Consumer `/app/vendors` |
| Procurement center | ✅ | `ProcurementCenter.tsx` |
| Enterprise multi-estate command center | ✅ | `CommandCenter.tsx`, `EnterpriseOperations.tsx` |
| Living documents workspace | ✅ | `ProductivityWorkspace.tsx` |
| Smart property / IoT devices | ✅ | `WorkspaceSmartProperty.tsx` |
| Revenue control plane (fees, plans, promos) | ✅ | `/admin/revenue/*` |
| 8-surface delivery (web, mobile, desktop, admin) | ✅ | Capacitor + Electron + SPA |

---

## Score summary

| Category | ✅ BaytMiftah full | ⚠️ Partial (Buildium) | ❌ Missing vs Buildium |
|----------|-------------------:|-----------:|------------------------:|
| Core PM | 16 | 2 | 0 |
| Accounting & finance | 18 | 0 | 0 |
| Payments | 9 | 0 | 0 (Buildium lacks MoMo/escrow) |
| Screening & compliance | 11 | 0 | 0 |
| Portals & comms | 11 | 2 | 0 |
| CRM & listings | 10 | 1 | 0 (Buildium lacks marketplace) |
| Reporting & AI | 10 | 0 | 0 |
| Integrations & platform | 10 | 2 | 0 |
| HOA | 4 | 0 | 0 |
| **BaytMiftah-only** | **14** | **0** | — |

---

## How to use this checklist

- **Sales calls:** Lead with ✅ rows in "BaytMiftah-only" and marketplace; acknowledge ⚠️ rows honestly as "configured at go-live."
- **Investor diligence:** Pair this doc with `BAYTMIFTAH_MASTER_REVIEW.md` for maturity (~75–78/100 pilot-ready).
- **US market entry:** Prioritize ❌ rows (1099, trust accounting, TransUnion, HOA) before claiming Buildium parity in the US.

*Evidence sourced from codebase scan: 70+ workspace pages, 140 services, 96 migrations, 15 edge functions.*
