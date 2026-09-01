# BaytMiftah REOS — Definitive Master Product, System & Operational Specification

> **Version:** 3.0.0 (Definitive Master Architecture)  
> **Status:** Canonical Production Reference & System Map  
> **Classification:** Definitive Product, Role, AI, Governance & Operational Architecture  
> **Operating Premise:** *People define policy. Deterministic software enforces the sub-ledger truth. AI monitors, reasons, recommends, drafts, and triages. Automation executes safe repeatable tasks. Humans approve high-risk decisions. The system immutably audits everything.*

---

## Table of Contents
1. [Executive Summary & Core Product Thesis](#1-executive-summary--core-product-thesis)
2. [Universal Role & Organizational Architecture](#2-universal-role--organizational-architecture)
3. [Production Site Map & Surface Architecture](#3-production-site-map--surface-architecture)
4. [The Shared Operational Core](#4-the-shared-operational-core)
5. [Public Property Explorer & Event Ledger](#5-public-property-explorer--event-ledger)
6. [Operations Command: My Work, Approvals & Exceptions](#6-operations-command-my-work-approvals--exceptions)
7. [Agentic AI Operating System & Governance](#7-agentic-ai-operating-system--governance)
8. [Training, Onboarding & SOP Knowledge Layer](#8-training-onboarding--sop-knowledge-layer)
9. [Legal, Evidence & Trust Control Plane](#9-legal-evidence--trust-control-plane)
10. [SaaS Operations, Customer Health & Commercial Model](#10-saas-operations-customer-health--commercial-model)
11. [Component Implementation Status Matrix](#11-component-implementation-status-matrix)

---

## 1. Executive Summary & Core Product Thesis

**BaytMiftah Real Estate Operating System (REOS)** is the integrated enterprise operating system and marketplace powering property transactions, asset operations, tenant lifecycles, physical maintenance, and financial sub-ledgers across emerging real-estate markets (with Ghana-first regulatory, mobile money, and legal infrastructure).

BaytMiftah is not a simple listing portal. It merges the discovery dynamics of **Zillow**, the provider/stay workflow of **Booking.com/Airbnb**, and the rigorous accounting depth of **Buildium** into an integrated, AI-native platform.

### Core Architectural Principles:
1. **The Unit is the Central Operational Object**: All leases, occupancies, charges, payments, work orders, meter readings, notices, and communications anchor to the Unit.
2. **One Universal Consumer Identity**: A single user identity navigates multiple concurrent relationship contexts (Owner of Unit A, Tenant in Unit B, Buyer of Deal C, Guest in Unit D) without account fragmentation.
3. **Deterministic Financial Sub-Ledger**: Money calculation, arrears aging, currency indexing, payment allocation, and double-entry general ledger transactions are mathematically immutable. BaytMiftah operates as an authoritative sub-ledger.
4. **Role-Aware Fleet of Specialized Agentic AI**: Instead of a generic single chatbot, BaytMiftah deploys domain-scoped agents with strictly bounded tools, RLS policies, kill-switches, and human-in-the-loop approval thresholds.
5. **Multi-Surface Accessibility**: 3 Product Families (Consumer, Business, Platform Admin) delivered across Web, Desktop (Electron), and Mobile (Android/iOS).

---

## 2. Universal Role & Organizational Architecture

To prevent architectural collapse, user identity is strictly orthogonal across three dimensions:
1. **Platform Owner / Platform Roles** (Operating BaytMiftah platform)
2. **Company / Organization Roles** (Employed by an enterprise/agency/developer/property firm)
3. **Property & Transaction Relationship Contexts** (Tied to an occupancy, ownership, or deal)

```text
                            BAYTMIFTAH IDENTITY
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
    PLATFORM                COMPANY / BUSINESS                EXTERNAL / CONSUMER
(Platform Admin)           (Enterprise / REOS)              (Marketplace & Assets)
       │                            │                            │
├── Platform Admin           ├── Executive / MD           ├── Property Owner (Self/Managed)
├── Platform Ops             ├── Property Managers        ├── External Contractor
├── Trust & Safety           ├── Facilities & Estate      ├── External Vendor
├── Platform Finance         ├── In-house Technicians     └── Universal Consumer:
├── Platform Analyst         ├── Finance & Collections         ├── Buyer Context
└── Platform Developer       ├── Sales & Marketing             ├── Tenant Context
                             └── Customer Service              ├── Resident Context
                                                               └── Guest Context
```

---

## 3. Production Site Map & Surface Architecture

```text
BAYTMIFTAH
│
├── 1. PUBLIC / MARKETING (baytmiftah.com)
│   ├── Home, About, Solutions (Property Mgmt, Agencies, Developers, Owners, Enterprise, Consumers)
│   ├── Pricing, AI & Automation, Resources, Blog, Contact, Book Demo, Auth
│   ├── blog.baytmiftah.com (Market Reports, Product News, Insights)
│   ├── docs.baytmiftah.com (API, Guides, Architecture Specs)
│   ├── support.baytmiftah.com (Help Center, Ticketing, FAQs)
│   └── status.baytmiftah.com (Uptime, Incident History, Service Health)
│
├── 2. MAIN APPLICATION (app.baytmiftah.com)
│   │
│   ├── AUTHENTICATION & CONTEXT RESOLUTION
│   │   ├── Sign In / Sign Up / MFA / Recovery / Org Selector / Persona Switcher
│   │
│   ├── CONSUMER EXPERIENCE (Web + Mobile)
│   │   ├── Explore (Search, OpenStreetMap, Filters, Recommendations, Quality Scores)
│   │   ├── Saved (Favorites, Search Alerts)
│   │   ├── Property Details (Explorer, Verification Badges, Tour Booking, Offers, Application)
│   │   ├── My Home (Lease, Pay Angels Checkout, Rent Waterfall, Maintenance Tickets, Notices)
│   │   └── Stays / Short-Stay (Reservations, Digital Gate Pass, Host Messaging)
│   │
│   ├── PROPERTY OWNER / OWNER-OPERATOR (Web + Mobile)
│   │   ├── Owner Dashboard (Net Yields, Occupancy, Real-Time Waterfall)
│   │   ├── Management Mode Selection: Self-Managed | Managed | Hybrid
│   │   ├── Assigned Units, Tenant Records, Arrears, Statements & GRA Tax Exports
│   │   └── Direct Payout Routing (Bank Wire / MTN MoMo / Telecel)
│   │
│   └── BUSINESS PLATFORM (Web + Desktop + Mobile)
│       │
│       ├── COMMAND & OPERATIONS
│       │   ├── My Work (Personalized prioritized daily task queue)
│       │   ├── Approval Center (1-click multi-domain authorizations)
│       │   ├── Exception Center (Real-time SLA breaches, broken PtPs, anomalies)
│       │   └── AI Command Center & AI Night Watch
│       │
│       ├── PROPERTY & LEASING MANAGEMENT
│       │   ├── Estates, Properties, Buildings, Units, Occupancies, Residents
│       │   ├── Property 360 & Unit 360 Views
│       │   ├── Public Lease Applications & KYC Screening Dossier
│       │   ├── eSignature Digital Contract Hub
│       │   └── Deposit Settlement & Move-in/Move-out Checklists
│       │
│       ├── FINANCIAL ENGINE & SUB-LEDGER
│       │   ├── General Ledger (Double-entry journal posting, periods & locking)
│       │   ├── Chart of Accounts (Tree view, Ghana standard templates)
│       │   ├── Journal Entry Manager (Draft, balanced debit/credit posting, reversal)
│       │   ├── Financial Statements (Trial Balance, P&L, Balance Sheet, CSV export)
│       │   ├── Payment Allocation (Deterministic multi-charge satisfaction)
│       │   ├── Recurring Charges & In-Database Generation
│       │   ├── Collections Cases (Durable arrears lifecycles, Promise-to-Pay tracking)
│       │   ├── Bank Reconciliation & Bank Feed Ingestion
│       │   └── Owner Disbursements (Real-time 10% fee + 8% GRA Rent Tax deductions)
│       │
│       ├── MAINTENANCE & PHYSICAL WORK
│       │   ├── Service Desk & Ticket Queue
│       │   ├── Work Orders & In-House Technician Mobile Execution
│       │   ├── Contractor Dispatch & Skill/Proximity Matching
│       │   ├── Contractor MoMo Direct Pay & Invoice Submissions
│       │   ├── Preventive Maintenance Schedules & Asset Registry
│       │   └── Gate Clearance Kiosk & Visitor Passes
│       │
│       ├── UTILITY SUB-METERING
│       │   ├── Meter Registry (Water, Electricity, Solar)
│       │   ├── Reading Ingestion & Anomaly Detection
│       │   └── Automated Sub-Meter Billing & Charge Generation
│       │
│       ├── PROCUREMENT (Procure-to-Pay)
│       │   ├── Purchase Requests & Order Generation
│       │   ├── AI Quote Comparison Matrix
│       │   ├── Goods Receipt Notes (GRN)
│       │   └── 3-Way Match & Variance Approvals
│       │
│       ├── CRM, SALES & MARKETING
│       │   ├── Lead Ingestion, Scoring & Pipeline
│       │   ├── Viewing Calendar & Schedule Automation
│       │   ├── Offer & Deal Management
│       │   └── Marketing Campaigns & Multi-Channel Attribution
│       │
│       ├── COMMUNICATIONS & SERVICE DESK
│       │   ├── Contextual Inbox (Unified across Property, Unit, Lease, Ticket)
│       │   ├── Omnichannel Engine: SMS (Arkesel/Hubtel), WhatsApp Cloud API, Email, Push
│       │   └── Message-to-Action Intent Parsing & Ticket Creation
│       │
│       ├── ONBOARDING, TRAINING & SOP AI
│       │   ├── Interactive Tutorials & "Show Me How"
│       │   ├── Safe Practice Mode (Isolated simulation sandbox)
│       │   ├── Company Knowledge / SOP AI (Strictly org-isolated retrieval)
│       │   └── Training Completion Analytics
│       │
│       └── PLATFORM ADMIN WORKSPACE (Platform Owner)
│           ├── System Health & Command Center
│           ├── Organizations & Tenant Isolation Audits
│           ├── Customer Health Scoring & SaaS Subscriptions
│           ├── Evidence Center & Legal Holds
│           └── AI Operations, Model Governance & Global Kill Switch
```

---

## 4. The Shared Operational Core

All transactions and workflows flow through five deterministic pillars:

```text
                     SHARED OPERATIONAL CORE
                                │
    ┌───────────────────────────┼───────────────────────────┐
    │                           │                           │
 PROPERTY                     PEOPLE                      MONEY
 ├─ Estates                  ├─ Consumers                ├─ Pay Angels Processing
 ├─ Units                    ├─ Owners                   ├─ Recurring Charges
 ├─ Leases                   ├─ Tenants                  ├─ Deterministic Allocation
 ├─ Maintenance              ├─ Technicians              ├─ Double-Entry GL
 └─ Assets                   └─ Vendors / Staff          └─ Owner Disbursements
                                │
                    ┌───────────┴───────────┐
                    │                       │
                  WORK                 INTELLIGENCE
                ├─ Tickets              ├─ Specialized Agents
                ├─ Tasks                ├─ AI Night Watch
                ├─ Approvals            ├─ SOP Knowledge RAG
                └─ Escalations          └─ In-Database Schedulers
```

---

## 5. Public Property Explorer & Event Ledger

Every property, unit, and transaction exposes a **public, privacy-preserving explorer URL**:

```text
baytmiftah.com/explorer/property/{public-id}
baytmiftah.com/explorer/unit/{public-id}
baytmiftah.com/explorer/transaction/{public-id}
```

### Privacy & Data Separation Rules:
- **Public Surface**: Displays Public Entity ID, Availability Status, Verification Badges (Title, Location, Provider), Append-Only Event Log, and Pseudonymous Actor IDs (`BM-P-82K9A`).
- **Private Layer**: Accessible only to verified participants & authorized organization staff — exposes Real Identity, Passports/Ghana Cards, Signed Leases, Unmasked Payments, and Private Notes.
- **Event Ledger State Progression**:
  `CREATED → LISTED → VERIFIED → VIEWING → OFFER → RESERVED → PAID → OCCUPIED → RENEWED / VACATED`

---

## 6. Operations Command: My Work, Approvals & Exceptions

1. **My Work**: Personalized operational queue aggregating urgent tasks, scheduled viewings, work order dispatches, and tenant follow-ups for each specific role.
2. **Approval Center**: Single-pane governance inbox consolidating multi-domain actions requiring human sign-off:
   - High-value Procurement Purchase Orders & Invoice Variances
   - Public Lease Application screening approvals
   - Monthly Owner Rental Waterfall Disbursements
   - Manual Journal Entry ledger postings and reversals
3. **Exception Center**: Live operational radar highlighting:
   - Broken Promises-to-Pay (PtP) & aging arrears
   - Work orders approaching or exceeding SLA thresholds
   - Leases expiring within 30/60/90 days without renewal activity
   - Failed webhook deliveries or unreconciled bank transactions

---

## 7. Agentic AI Operating System & Governance

### Autonomous Specialized Agent Fleet:
- **Leasing Agent**: Computes rent-to-income affordability, evaluates guarantor strength, assigns risk tiers, and recommends required deposit terms.
- **Collections Agent**: Evaluates delinquency duration and breach history to select the appropriate recovery strategy with localized Ghanaian messaging.
- **Maintenance Dispatch Agent**: Uses multi-criteria composite scoring (trade skill, distance in km, SLA completion rate, pricing) to rank technicians.
- **Finance & Audit Agent**: Inspects trial balances for abnormal sign balances, unposted draft entries, and period close readiness.
- **AI Night Watch**: Proactive background scanner detecting arrears, vacancies, failed automations, and contractor delays.

### AI Governance & Safety Controls:
- **Level 0**: Read-only suggestions & drafting (No approval needed).
- **Level 1**: Policy-bounded automated execution (e.g. standard reminder dispatch).
- **Level 2**: High-impact proposals requiring human approval via the Approval Center.
- **AI Kill Switch**: Global and per-agent circuit breakers to instantly halt AI actions in emergency scenarios.
- **Immutable AI Action Ledger**: Logs Agent ID, prompt context, tool executed, confidence score, approval state, and result.

---

## 8. Training, Onboarding & SOP Knowledge Layer

1. **"Show Me How" & Interactive Walkthroughs**: Route-mapped interactive UI element highlights guiding users step-by-step through complex workflows (e.g. Bank Reconciliation, Journal Posting).
2. **Safe Practice Mode**: Ephemeral sandbox workspace with pre-seeded demo data allowing new staff to simulate transactions without production side-effects.
3. **Company Knowledge / SOP AI**: Secure RAG architecture allowing firms to upload internal handbooks and policies. Strict organization isolation ensures zero cross-tenant knowledge retrieval.
4. **Training Analytics**: Executive visibility into role-specific onboarding progress and module completion rates.

---

## 9. Legal, Evidence & Trust Control Plane

1. **Defensible Legal Architecture**: BaytMiftah operates strictly as technology provider and sub-ledger software, with explicit SaaS terms, Data Protection Agreements (DPA), and managed service agreements.
2. **Evidence Center**: Unified investigative dossier providing a complete, chronological timeline of every event (Listing → Lease → Signatures → Payments → Tickets → Messages → Approvals → Resolutions) for litigation defence or dispute resolution.
3. **Security Center**: Administrative radar tracking suspicious logins, MFA challenges, permission alterations, unusual data exports, and API anomalies.

---

## 10. SaaS Operations, Customer Health & Commercial Model

1. **Commercial Model**:
   - **Primary**: B2B SaaS Subscriptions (Per-unit / Per-seat tiers for property firms, agencies, and developers).
   - **Secondary**: Transaction fees on Pay Angels / Mobile Money processing & marketplace escrow.
   - **Add-on**: Premium AI workforce tokens, WhatsApp message credits, and white-label custom domain/branding packages.
2. **Customer Health Scoring**: 0–100 telemetry tracking adoption, active daily users, module depth, AI utilization, support ticket volume, and renewal risk.
3. **Cost Intelligence**: Unit-level tracking of LLM API costs, SMS gateway expenses, storage utilization, and serverless compute per tenant.

---

## 11. Component Implementation Status Matrix

| Component / Subsystem | Status | Current Code / Database Reference |
|-----------------------|--------|-----------------------------------|
| **Public Property Explorer** | `[Implemented]` | `PublicPropertyExplorer.tsx`, `PropertyDetail.tsx` |
| **Chart of Accounts Admin** | `[Implemented]` | `ChartOfAccountsAdmin.tsx`, `chart-of-accounts.service.ts` |
| **Ghana COA Templates** | `[Implemented]` | `coa-templates.ts` (Residential, Commercial, Mixed-use) |
| **Journal Entry Manager** | `[Implemented]` | `JournalEntryManager.tsx`, `general-ledger.service.ts` |
| **Financial Statements (P&L/Balance)** | `[Implemented]` | `FinancialStatementsViewer.tsx`, `estate-reporting.service.ts` |
| **Payment Allocation Engine** | `[Implemented]` | `payment-allocation.service.ts`, `2026082203_...allocation.sql` |
| **Recurring Charge Automation** | `[Implemented]` | `charge-template.service.ts`, `charge-generation.service.ts` |
| **Procure-to-Pay 3-Way Match** | `[Implemented]` | `ProcurementCenter.tsx`, `invoice-matching.service.ts` |
| **Collections Cases & PtP** | `[Implemented]` | `CollectionsCases.tsx`, `collections-case.service.ts`, `promise-to-pay.service.ts` |
| **Leasing Application Intake** | `[Implemented]` | `LeasingApplications.tsx`, `public_lease_applications` table |
| **eSignature Hub** | `[Implemented]` | `ESignature.tsx`, `esignature.service.ts` |
| **Owner Rental Waterfall** | `[Implemented]` | `OwnerDisbursements.tsx`, `owner-disbursement.service.ts` |
| **Executive Approval Center** | `[Implemented]` | `ApprovalCenter.tsx`, `approval-center.service.ts` |
| **Exception & Incident Center** | `[Implemented]` | `ExceptionCenter.tsx`, `exception-center.service.ts` |
| **Specialized Agent Fleet** | `[Implemented]` | `agent-fleet.service.ts` (Leasing, Collections, Maintenance, Finance) |
| **In-Database pg_cron Schedulers** | `[Implemented]` | `2026083001_automated_pg_cron_schedules.sql` |
| **Utility Sub-Metering** | `[Implemented]` | `UtilitySubmetering.tsx`, `utility-submeter.service.ts` |
| **Gate Clearance Kiosk** | `[Implemented]` | `GateClearanceKiosk.tsx`, `visitor-clearance.service.ts` |
| **WhatsApp Business Bot Hub** | `[Implemented]` | `WhatsAppAutomationHub.tsx`, `whatsapp-business-bot.service.ts` |
| **OpenStreetMap Geointelligence** | `[Implemented]` | `MapView.tsx`, `openstreetmap.service.ts` |
| **Bank Feeds Live API (Mono/Plaid)**| `[Productionization]` | `bank-feed.service.ts` (CSV active; API keys needed) |
| **DocuSign / PandaDoc SDK** | `[Productionization]` | `esignature.service.ts` (Sim active; API keys needed) |
| **Live Pay Angels Secret Rotation** | `[Productionization]` | `.env.vercel.production`, `DEPLOYMENT_GUIDE.md` |
| **Multi-Environment Infrastructure**| `[Productionization]` | Separate Dev/Staging/Prod Supabase projects |
| **Cross-Company Network / API** | `[Future / Wave 2+]`| Developer Portal & Public Partner APIs |
| **AWS Cloud Migration** | `[Deferred]` | Documented in `AWS_MIGRATION_PLAN.md` (when traffic warrants) |

---
*BaytMiftah REOS — All core architecture, services, UI surfaces, and sub-ledger mechanics are verified complete.*
