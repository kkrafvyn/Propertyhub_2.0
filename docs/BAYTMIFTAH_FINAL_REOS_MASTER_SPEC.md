# BaytMiftah REOS — Final Master Product & Architecture Specification

> **Version:** 2.0.0 (Master Final)  
> **Classification:** Definitive Product, Role, AI & System Architecture  
> **Core Operating Premise:** *People define policy. Deterministic software protects the truth. AI monitors, reasons, recommends, and drafts. Automation executes safe repeatable work. Humans approve high-risk decisions. The system audits everything.*

---

## 1. Executive Summary & Core Product Thesis

**BaytMiftah REOS (Real Estate Operating System)** is an integrated, enterprise-grade operating system and marketplace connecting properties, people, money, physical work, and communication across the African real estate ecosystem (with Ghana-first regulatory and payment infrastructure).

The goal is not feature-count competition. The goal is **connected-workflow superiority**.

### Core Tenets
1. **The Unit is the Central Operational Object**: All leases, occupancies, charges, payments, work orders, meter readings, notices, and communications anchor to the Unit.
2. **One Universal Consumer Identity**: A single user identity seamlessly navigates multiple concurrent relationship contexts (e.g. Owner of Unit A, Tenant in Unit B, Buyer of Deal C, Guest in Unit D) without fragmented accounts.
3. **Deterministic Financial Truth**: Money calculation, arrears aging, currency indexing, payment allocation, and ledger transactions are mathematically immutable. BaytMiftah operates as an authoritative property sub-ledger and does not pool customer funds as a custodian.
4. **Role-Aware Fleet of Agentic AI**: Instead of a generic single chatbot, BaytMiftah deploys a specialized fleet of domain agents with strictly scoped tools, RLS boundaries, and approval tiers.
5. **8-Surface Seamless Experience**: 3 Product Families (Consumer, Business, Admin) delivered across Web, Desktop (Electron), and Mobile (Android/iOS).

---

## 2. Universal Role & Relationship Architecture

To prevent architectural collapse, roles are strictly separated into three orthogonal dimensions:
1. **Platform Roles** (Operating BaytMiftah platform)
2. **Organization / Company Job Roles** (Employed by an enterprise/agency/developer)
3. **Property / Transaction Relationship Contexts** (Tied to an occupancy, deal, or contract)

```
                            BAYTMIFTAH USERS
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      │                            │                            │
   PLATFORM                COMPANY / BUSINESS                EXTERNAL / CONSUMER
      │                            │                            │
  (Admin Portal)          (Enterprise / ERP)            (Marketplace & Assets)
```

```
BAYTMIFTAH USERS
│
├── PLATFORM
│   ├── Platform Admin (Full control of BaytMiftah platform)
│   ├── Platform Operations (Platform-wide operational management)
│   ├── Trust & Safety (KYC, verification, fraud investigation, moderation)
│   ├── Platform Support (Customer, company, and dispute support)
│   ├── Platform Finance (Platform fees, processor reconciliation, merchant billing)
│   ├── Platform Analyst (Macro-marketplace analytics and platform telemetry)
│   └── Platform Developer (Technical integrations and platform infrastructure)
│
├── COMPANY / BUSINESS
│   │
│   ├── EXECUTIVE
│   │   ├── Organization Owner (Company account owner, billing, integrations, permissions)
│   │   └── Managing Director / Executive (Portfolio revenue, arrears, executive briefing)
│   │
│   ├── PROPERTY MANAGEMENT
│   │   ├── Head of Property Management (Portfolio SLAs, vendor budgets, escalation policies)
│   │   ├── Property Manager (Assigned estates/units, leases, tenant management, arrears)
│   │   ├── Facilities Manager (Physical assets, work orders, preventive maintenance, utilities)
│   │   ├── Estate Officer (On-site mobile ops: unit inspections, meter readings, notices)
│   │   ├── Caretaker (Day-to-day estate presence, resident assistance, defect logging)
│   │   └── In-house Technician (Mobile-only job execution: start job, photo, materials, complete)
│   │
│   ├── FINANCE
│   │   ├── Head of Finance / Finance Manager (Billing, collections, general ledger exports, budgets)
│   │   ├── Finance Officer / Accountant (Payment verification, reconciliations, unit statements)
│   │   └── Collections Officer (Arrears aging, payment promises, payment plan enforcement)
│   │
│   ├── SALES
│   │   ├── Sales Manager (Pipeline conversion, agent commission splits, deal closing)
│   │   └── Sales Agent (Lead follow-ups, viewing schedules, offers, negotiation)
│   │
│   ├── MARKETING
│   │   ├── Marketing Manager (Campaign attribution, promotion budgets, channel analytics)
│   │   └── Marketing Officer / Specialist (Listing content, campaign creation, ad tracking)
│   │
│   ├── CUSTOMER SERVICE
│   │   ├── Customer Service Manager (Service desk SLAs, complaint resolution, queue routing)
│   │   └── Customer Service Agent (Omnichannel inquiry intake, ticket creation, customer follow-up)
│   │
│   └── ANALYTICS & ENTERPRISE
│       ├── Analyst (Read-only intelligence, market cap models, compliance auditing)
│       ├── Developer / Partner (Project handover, snagging, construction warranty)
│       └── Enterprise Operator (Multi-company portfolio consolidation, cross-regional operations)
│
├── EXTERNAL
│   ├── Property Owner (Asset owner viewing owned units, statements, net yields)
│   ├── Contractor (External service technician: quote, accept job, upload evidence, invoice)
│   ├── Vendor (External service provider company: e.g. ABC Cleaning Services Ltd)
│   └── Developer / Partner (Construction & development partner)
│
└── CONSUMER
    └── Universal Consumer Identity
        ├── Buyer context (Offers, escrow payments, purchase contracts)
        ├── Tenant context (Leases, rent payments, gate passes, utility bills)
        ├── Resident context (Estate amenities, maintenance requests, community notices)
        ├── Guest context (Short-stay bookings, digital check-in, host messaging)
        └── Owner context (Owned unit oversight and rental yield tracking)
```

---

## 3. Product Families & 8 Application Surfaces

BaytMiftah is architected across **3 Product Families** spanning **8 Application Surfaces**, all communicating with a shared backend core and unified data model.

| Product Family | Web Application | Desktop Application (Electron) | Android Mobile (Capacitor/Native) | iOS Mobile (Capacitor/Native) |
| :--- | :--- | :--- | :--- | :--- |
| **Consumer** | ✅ Universal Browser | — | ✅ Everyday Mobile | ✅ Everyday Mobile |
| **Business** | ✅ Daily Company ERP | ✅ Heavyweight Desktop | ✅ Role-Aware Mobile | ✅ Role-Aware Mobile |
| **Admin** | ✅ Platform Management | ✅ Deep Forensics/Ops | ✅ Urgent Incident Triage | ✅ Urgent Incident Triage |

### 3.1 Consumer Surfaces
- **Consumer Web**: Search, interactive maps, listing comparison, saved properties, viewing requests, KYC verification, digital lease signing, MoMo/card checkout, tenant portal ("My Home").
- **Consumer Mobile**: Ultra-lightweight daily property app (`Home`, `Explore`, `Saved`, `Messages`, `Profile`). In-context access to gate passes (QR/PIN), instant MoMo rent payments, work order tracking, and host messaging. Excludes ERP complexities.

### 3.2 Business Surfaces
- **Business Web**: Full browser workspace for daily company operations: CRM pipeline, leases, tenants, service desk, maintenance tickets, financial ledgers, and team coordination.
- **Business Desktop (Electron)**: Powerhouse environment for high-density enterprise operations:
  - Multi-tab Chart of Accounts, General Ledger & Journal Entry postings.
  - Multi-Currency FX Hedging and Bank of Ghana rate synchronization.
  - Full Procure-to-Pay (Purchase Request ➔ RFQ ➔ Quote Matrix ➔ PO ➔ Goods Receipt ➔ 3-Way Match ➔ MoMo/Bank Payout).
  - Bulk CSV/Excel data onboarding with AI schema mapping and validation.
  - Custom Workflow Engine builder and AI Command Center.
- **Business Mobile**: Dynamic role-adaptive application that customizes its entire UI, navigation, and tools based on the user's role:
  - *Estate Officer / Caretaker*: GPS-tagged move-in/move-out 150-point inspections, native camera photo capture, meter reading barcode scanning, offline sync.
  - *In-house Technician*: High-contrast, low-bandwidth "My Jobs" queue with 1-tap status updates, offline media caching, and material cost logging.
  - *Executive / MD*: Daily morning KPI briefing, revenue burn vs. collection, approval center.

### 3.3 Admin Surfaces
- **Admin Web / Desktop**: Platform governance, listing moderation, dispute arbitration, Trust & Safety KYC reviews, Pay Angels reconciliation, platform fees, and AI safety monitoring.
- **Admin Mobile**: Mobile incident center for urgent platform alerts, fraud locks, and high-level escalations.

---

## 4. Core Operational 360 Models

### 4.1 Unit 360 (The Central Operational Anchor)
Every operational event in BaytMiftah attaches to a physical **Unit**:
```
Unit
├── Physical Attributes (Building, Floor, Square Footage, Meter IDs, Digital Twin)
├── Ownership (Property Owner, Title Deed, Mandate Agreement, Payout Account)
├── Active Occupancy (Tenant / Resident, Lease Agreement, Lease Terms, Rent Schedule)
├── Financial Sub-Ledger (Immutable Charges, MoMo Payments, Arrears, Security Deposit Escrow)
├── Utility Sub-Metering (Electricity kWh, Water m³, Generator Hours, Solar Tariffs)
├── Physical Maintenance (Issues, Open Work Orders, Asset Registry, Recurring PM Plans)
├── Field Operations (150-point Checklists, Photo Evidence, Move-in/out Condition Reports)
├── Communications & Security (Gate Passes, Delivery Records, Tenant Notices, Service Desk History)
└── Immutable Audit Trail (SHA-256 State Change Log, Timestamps, Actor User IDs)
```

### 4.2 Property 360
Consolidates entire estates and multi-unit developments:
- Master building topology, common area assets (generators, pumps, elevators, solar arrays).
- Aggregate occupancy rate, vacancy forecasting, estate service charge roll.
- Vendor service contracts, perimeter security kiosk records, and municipal compliance certificates.

### 4.3 Customer 360
Unified multi-role profile linking all interactions:
- Active leases, past tenancies, submitted property purchase offers, short-stay bookings.
- Unified payment history, Pay Angels customer references, Ghana Card verification status.
- Omnichannel message transcripts (WhatsApp, SMS, Email, In-App) and open service desk tickets.

---

## 5. End-to-End Operational Workflows

### 5.1 Maintenance ➔ Contractor ➔ Escrow Payout Workflow
```
[Resident / Caretaker logs Issue]
               │
               ▼
[AI Maintenance Agent classifies urgency, trade skill & checks warranty]
               │
      ┌────────┴────────────────────────┐
      ▼                                 ▼
[In-House Technician Available]   [Outsource to Contractor Network]
      │                                 │
      │                           [AI Contractor Agent matches 3 vetted vendors]
      │                                 │
      │                           [Quotes received & compared in Matrix]
      │                                 │
      │                           [Manager approves quote (Level 2 Approval)]
      │                                 │
      └────────┬────────────────────────┘
               │
               ▼
[Work Order dispatched to Mobile / WhatsApp]
               │
               ▼
[Technician/Contractor executes work & uploads GPS-tagged Before/After Photos]
               │
               ▼
[Resident / Estate Officer confirms completion]
               │
               ▼
[Finance Sub-Ledger generates Payable & releases MTN MoMo / Telecel / Bank Escrow]
               │
               ▼
[Tenant/Owner Account charged if chargeable & Unit Statement updated]
```

### 5.2 Deterministic Financial Sub-Ledger & Pay Angels Pipeline
```
[Charge Generated (Rent, Service Charge, Utility)]
               │
               ▼
[Immutable Charge Record Created in Sub-Ledger]
               │
               ▼
[Omnichannel Notification dispatched with Pay Angels / MoMo Payment Link]
               │
               ▼
[Customer pays via MTN MoMo / Telecel / Card / Bank Transfer]
               │
               ▼
[Payment Processor Webhook with Idempotency Token received]
               │
               ▼
[Deterministic Allocation Engine allocates payment to oldest arrears / target charge]
               │
               ▼
[Digital Receipt generated with SHA-256 Hash & Tenant/Owner ledger updated]
```

---

## 6. Fleet of Specialized Agentic AI Operating System

BaytMiftah rejects the single "do-it-all" chatbot model in favor of an **orchestrated fleet of specialized domain agents**, each operating with explicit tool definitions, strict RBAC permissions, and an immutable action ledger.

```
                                  BAYTMIFTAH AI ORCHESTRATOR
                                               │
      ┌──────────────────┬─────────────────────┼─────────────────────┬──────────────────┐
      │                  │                     │                     │                  │
PROPERTY AGENT     FINANCE AGENT          SALES AGENT         MAINTENANCE AGENT   LEASING AGENT
(Vacancies, SLAs,  (Reconciliation,      (CRM Qualification,  (Triage, Quotes,    (Act 220 Audit,
 Occupancies)       Arrears, Ledgers)     Tour Scheduling)     SLA Monitoring)     OCR, Screening)
      │                  │                     │                     │                  │
COLLECTIONS AGENT  MARKETING AGENT       CONTRACTOR AGENT     SERVICE DESK AGENT  UTILITY AGENT
(Aging, Promises,  (Ad Copy, Channel     (Matching, Quotes,   (Ticket Routing,    (Anomaly Detection,
 WhatsApp Followup) Conversion)           Scorecards)          FAQ Triage)         Tariff Invoicing)
      │                  │                     │                     │                  │
INSPECTION AGENT   ASSET AGENT           PROCUREMENT AGENT    COMMUNICATION AGENT EXECUTIVE AGENT
(Defect Diffing,   (Preventive Maint,    (PO 3-Way Match,     (Channel Selection, (Portfolio Briefing,
 Chargeability)     Generator Logs)       RFQ Comparison)      Escalation Queue)   Macro Risk Alerts)
```

### 6.1 Agent Directory & Capabilities

| Agent | Domain Responsibility | Key Tool Capabilities |
| :--- | :--- | :--- |
| **Property Management Agent** | Portfolio vacancies, lease expiries, repeated building defects, occupancy turnover. | `getUnitOccupancy()`, `detectLeaseExpiries()`, `flagSlaBreaches()`, `createPropertyTask()` |
| **Finance Agent** | Charge verification, payment matching, reconciliation discrepancies, statement generation. | `reconcilePayments()`, `detectUnmatchedCredits()`, `calculateArrearsAging()`, `verifyLedgerIntegrity()` |
| **Collections Agent** | Payment reminder automation, promise-to-pay tracking, automated WhatsApp follow-ups. | `scoreTenantRisk()`, `draftCollectionMessage()`, `trackPromiseToPay()`, `escalateDefault()` |
| **Leasing Agent** | Tenancy application screening, Ghana Rent Act 220 compliance checking, OCR extraction. | `ocrLeaseDocument()`, `auditAct220Compliance()`, `verifyGhanaCard()`, `generateLeasePack()` |
| **Sales Agent** | Inbound lead qualification, buyer matching, viewing scheduling, deal negotiation summaries. | `qualifyLead()`, `matchBuyerPreferences()`, `scheduleViewing()`, `draftOfferSummary()` |
| **Marketing Agent** | Listing description generation, campaign conversion tracking, underperforming unit alerts. | `generateListingCopy()`, `analyzeListingEngagement()`, `recommendPriceAdjustment()` |
| **Maintenance Agent** | Defect triage, trade skill classification, duplicate issue deduplication, SLA tracking. | `classifyIssueSeverity()`, `detectDuplicateIssues()`, `calculateSlaDeadline()`, `dispatchJob()` |
| **Contractor Agent** | Contractor network matching, RFQ distribution, quote matrix comparison, vendor scoring. | `matchContractors()`, `compareQuotes()`, `evaluateContractorSla()`, `flagCostAnomalies()` |
| **Customer Service Agent** | Front-line resident and buyer inquiries, balance checks, ticket creation and status tracking. | `lookupCustomerAccount()`, `createServiceTicket()`, `queryKnowledgeBase()`, `routeToDepartment()` |
| **Communication Agent** | Channel routing (WhatsApp vs. SMS vs. Push vs. Email), timing optimization, escalation ladders. | `selectOptimalChannel()`, `queueNotification()`, `trackDeliveryReceipt()`, `triggerEscalation()` |
| **Inspection Agent** | Move-in vs. Move-out defect diffing, condition report generation, tenant chargeability calculation. | `diffInspectionChecklists()`, `assessWearVsDamage()`, `calculateRepairCharges()`, `generateReport()` |
| **Utility Agent** | ECG/GWCL meter reading validation, consumption anomaly detection, tariff calculation. | `validateMeterReading()`, `detectLeakageAnomalies()`, `applyTariffTier()`, `generateUtilityInvoice()` |
| **Asset Agent** | Critical equipment tracking (generators, water pumps, elevators, solar), runtime hour logs. | `trackAssetRuntime()`, `schedulePreventiveService()`, `detectFailurePatterns()`, `checkWarranty()` |
| **Procurement Agent** | Purchase requisitions, vendor RFQs, budget limit checks, 3-way invoice matching. | `createPurchaseOrder()`, `matchInvoiceToGoodsReceipt()`, `verifyBudgetLimit()`, `routeForApproval()` |
| **Executive Agent** | Macro portfolio KPIs, revenue forecasts, Bank of Ghana FX exposure, risk synthesis. | `generateMorningBriefing()`, `simulateFxHedgingYield()`, `benchmarkCapRates()`, `flagEnterpriseRisks()` |

---

## 7. AI Action Governance & Multi-Tier Approval Framework

To guarantee enterprise trust and compliance, AI actions are categorized into **4 Deterministic Risk Levels**:

```
LEVEL 0: Autonomous (Safe)
├── Generate internal report
├── Create reminder task
├── Classify maintenance ticket trade
└── Format WhatsApp notification draft

LEVEL 1: Policy-Bound Autonomous
├── Assign on-duty in-house technician
├── Send routine payment reminder (3 days before due)
├── Request quotes from 3 approved contractors
└── Schedule routine preventive inspection

LEVEL 2: Human Approval Required (One-Click Approval)
├── Approve contractor quote > GHS 1,000
├── Issue rent refund or ledger adjustment
├── Dispatch legal eviction warning notice
└── Apply tenant repair charge from move-out inspection

LEVEL 3: Human-Only Execution (AI strictly forbidden)
├── Release escrow / disbursement of funds
├── Terminate or alter executed legal lease agreement
├── Delete or purge organization/unit records
└── Legal dispute filings & court action escalations
```

### 7.1 The AI Action Ledger
Every AI reasoning step and proposed action is persisted to an immutable audit ledger:
```json
{
  "action_id": "act_8849201a",
  "agent": "MaintenanceAgent",
  "organization_id": "org_accra_luxury",
  "triggered_by": "event:issue.created",
  "target_entity": "unit:apt_4b_cantonments",
  "action_type": "contractor.rfq_dispatch",
  "reasoning": "Resident reported water heater electrical trip. In-house electrician is on leave. Selected 3 top-rated electricians within 5km radius.",
  "risk_level": "LEVEL_1",
  "approval_status": "auto_approved_by_policy",
  "execution_result": "success",
  "created_at": "2026-08-19T06:00:00Z"
}
```

### 7.2 AI Night Watch
Runs autonomously every night across all properties:
1. **Scans 100% of Active Leases**: Detects renewals due within 60/30 days, missing deposits, expired Ghana Cards.
2. **Audits Financial Receivables**: Flags invoices overdue > 7 days, unallocated bank credits, and currency indexing collar variances.
3. **Inspects Maintenance Queue**: Identifies jobs breaching SLAs, missing completion photos, or unapproved contractor quotes.
4. **Synthesizes Morning Briefing**: Delivers a crisp, 5-point executive summary with ready-to-approve actions to the property manager at 7:00 AM.

---

## 8. Multi-Agent Coordinated Operations (Real-World Scenarios)

### Scenario A: Unit Becomes Vacant (Turnover Chain)
```
[Leasing Agent detects upcoming lease expiration]
               │
               ▼
[Inspection Agent schedules Move-Out Inspection on Estate Officer mobile]
               │
               ▼
[Inspection completed: 2 defects detected ➔ Maintenance Agent dispatches Painter]
               │
               ▼
[Repairs verified ➔ Marketing Agent generates listing description & photos]
               │
               ▼
[Sales Agent activates matching waitlist leads & schedules viewings]
               │
               ▼
[Leasing Agent receives application, checks Ghana Card & audits Act 220 lease terms]
               │
               ▼
[Finance Agent sets up new rent schedule & deposit escrow ➔ Unit re-occupied]
```

### Scenario B: Emergency Water Pipe Burst
```
[Resident sends WhatsApp: "Water is flooding my bathroom in Block B!"]
               │
               ▼
[Customer Service Agent creates Emergency Ticket & detects Unit 204]
               │
               ▼
[Maintenance Agent detects high-urgency plumbing & checks Block B duplicate alerts]
               │
               ▼
[Contractor Agent locates nearby on-call Plumber & dispatches emergency job pass]
               │
               ▼
[Gate Clearance Kiosk generates instant security access PIN for Artisan]
               │
               ▼
[Work completed with photo proof ➔ Resident confirms via SMS ➔ MoMo escrow paid]
```

---

## 9. Deterministic vs. AI System Boundaries

| Function | Execution Engine | Rationale |
| :--- | :--- | :--- |
| **Money Calculations & Ledgers** | **Deterministic Code** | Zero tolerance for hallucination; arithmetic must be exact and auditable. |
| **Arrears Aging & Penalties** | **Deterministic Code** | Regulated by contract law and financial accounting standards. |
| **Row Level Security (RLS) & Auth** | **Deterministic Code** | Security boundaries must never depend on model prompts. |
| **SLA Countdown Timers** | **Deterministic Code** | Timestamps and contract deadlines are strictly mathematical. |
| **Document Classification & OCR** | **Agentic AI** | Robust parsing of unstructured scanned PDFs, photos, and variations. |
| **Contractor Matching & Scoring** | **Agentic AI** | Multi-dimensional weighting of distance, skills, rating, and historical cost. |
| **Natural Language Query Engine** | **Agentic AI** | Translating multi-dialect requests into structured REOS-QL / SQL filters. |
| **Anomaly & Risk Detection** | **Agentic AI** | Pattern recognition across thousands of utility, maintenance, and payment data points. |

---

## 10. Technical Stack & Implementation Architecture

```
                                  FRONTEND LAYER
      ┌─────────────────────────────────┼─────────────────────────────────┐
      │                                 │                                 │
  React 18.3.1 + Vite 6           Electron Desktop               Capacitor 8 Mobile
  (Tailwind 4, Radix UI,          (Multi-Window ERP,             (Native Camera, GPS,
   Shadcn UI Design Tokens)        Native Menus, Local IPC)       Biometrics, Offline IDB)
```
```
                                  BACKEND CORE (Supabase)
      ┌─────────────────────────────────┼─────────────────────────────────┐
      │                                 │                                 │
  PostgreSQL 15 (Immutable         Edge Functions (Deno)          Row Level Security (RLS)
  Sub-Ledgers, JSONB Twins,        (Arkesel SMS, Pay Angels,      (Multi-Tenant Org &
   PostGIS Geolocation)             WhatsApp Webhooks, PDF OCR)    Unit-Context Isolation)
```
```
                                  PAYMENT & INTEGRATION RAILS
      ┌─────────────────────────────────┼─────────────────────────────────┐
      │                                 │                                 │
  Pay Angels / MTN MoMo           Bank of Ghana FX Feed          Arkesel / WhatsApp Cloud
  (Mobile Money, Cards,            (Daily Reference Sync,         (Interactive SMS, QR Gate
   Direct Bank Settlements)         Dual-Currency Indexing)        Passes, Chatbot Webhooks)
```

---

## 11. Engineering Build Phases & Definition of Done

### Phase Roadmap
- **P0 — Sub-Ledger & Operational Foundation**: Complete general ledger mappings, chart of accounts, bank reconciliations, immutable charge-payment pipelines, and Act 220 compliance auditor. *(Completed & Audited)*
- **P1 — Enterprise 360 & Contractor Ecosystem**: Unit 360, Property 360, Customer 360, Service Desk, Contractor Network bidding, and utility sub-metering engine. *(Completed & Audited)*
- **P2 — Agentic AI Fleet & Automation Engine 2.0**: Specialized agent fleet, AI Night Watch, 4-tier approval framework, WhatsApp Business conversational state machine, and BOG multi-currency hedging engine. *(Completed & Audited)*
- **P3 — Native Packaging & White-Label Platform**: Electron desktop binaries, Capacitor 8 Android/iOS builds with native biometrics and offline inspection queues, and organization white-label custom theming. *(Completed & Audited)*
- **P4 — Enterprise Moat & Integration Marketplace**: Public REOS API, real-time webhooks, IoT sub-meter telemetry integrations, and Pan-African multi-currency settlement expansion.

### Strict Definition of Done (DoD)
A feature is **Done** if and only if:
1. **Problem Validated**: Aligned with domain specifications and real estate user personas.
2. **Database Connected & Secured**: PostgreSQL schema created with explicit RLS policies for multi-tenancy.
3. **Deterministic Business Logic**: Authoritative transactions and calculations implemented with unit test coverage.
4. **Agentic & Automation Hooks**: Events emit triggers for relevant AI agents and automation rules.
5. **Universal Design System**: High-contrast, theme-tokenized UI (`bg-surface`, `text-ink`, `border-surface-border`) verified across Light and Dark modes.
6. **Mobile & Desktop Tested**: Verified for responsive web, native mobile touch/camera targets, and desktop windowing.
7. **Type-Safe & Tested**: `npm run typecheck` passes with 0 errors and all unit test suites pass (100% green).
