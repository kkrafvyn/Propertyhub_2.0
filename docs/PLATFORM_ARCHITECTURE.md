# BaytMiftah Platform Architecture

> The operating system for real estate — 12 interconnected platforms, one AI layer, multiple revenue streams.

---

## Platform overview

| # | Platform | Purpose | Primary users |
|---|----------|---------|---------------|
| 1 | **Marketplace** | Property discovery | Buyers, renters, investors |
| 2 | **Buyer App** | Purchase journey | Buyers |
| 3 | **Renter App** | Rental lifecycle | Renters, tenants |
| 4 | **Agent CRM** | Agent productivity | Independent agents |
| 5 | **Agency ERP** | Run agencies | Agency owners, managers |
| 6 | **Property Management (PMS)** | Buildings & tenants | Owners, property managers |
| 7 | **Smart Property** | Connected buildings | Owners, operators |
| 8 | **Financial Services** | Money flows | Buyers, renters, agents, banks |
| 9 | **Real Estate Intelligence** | Data moat | Investors, agencies, enterprise |
| 10 | **Developer Platform** | New developments | Developers |
| 11 | **Enterprise Asset Management** | Institutional portfolios | REITs, funds, governments |
| 12 | **Trust & Compliance** | Platform trust | Admin, compliance, all users |

**Cross-cutting:** BaytMiftah AI sits across every module.

---

## User roles

| Role | Primary platforms |
|------|-------------------|
| Buyer | Marketplace, Buyer App, Financial Services |
| Renter | Marketplace, Renter App, Financial Services |
| Investor | Marketplace, Intelligence, Enterprise |
| Independent agent | Marketplace, Agent CRM |
| Agency owner / manager | Agency ERP, Agent CRM, Trust |
| Property manager | PMS, Smart Property |
| Property owner | PMS, Smart Property, Owner App |
| Developer | Developer Platform |
| Platform admin | Trust & Compliance, all admin surfaces |
| Enterprise operator | Enterprise Asset Management |

---

## 1. Marketplace platform

**Purpose:** Property discovery

**Features**

- Property search: buy, rent, commercial, land, luxury
- Property details: photos, videos, virtual tours, documents
- AI search: natural language, voice
- Neighborhood intelligence: schools, crime, hospitals, infrastructure
- Property comparison
- Mortgage estimator
- Investment calculator

**Route prefix (planned):** `/` · `/explore` · `/property/:id` · `/compare` · `/neighborhoods`

---

## 2. Buyer app

**Purpose:** Help buyers purchase property

**Features**

- Saved properties
- Viewing scheduler
- Offer room
- Negotiation center
- Document vault
- Transaction center
- AI advisor (pricing, neighborhood growth, rental yield)
- Financing center

**Route prefix (planned):** `/buyer` · `/saved` · `/trips` · `/offers` · `/documents` · `/transactions`

---

## 3. Renter app

**Purpose:** Rental lifecycle

**Features**

- Rental search
- Lease management
- Rent payments
- Maintenance requests
- Tenant communication
- Utility management
- Move-in / move-out checklist
- Digital lease signing

**Route prefix (planned):** `/renter` · `/lease` · `/maintenance` · `/payments`

---

## 4. Agent CRM

**Purpose:** Increase agent productivity

**Features**

- Dashboard
- Lead pipeline: Lead → Contacted → Viewing → Offer → Closed
- Listing management
- Commission tracking
- Marketing automation
- AI listing coach
- Calendar, tasks
- Email automation, WhatsApp, call tracking
- Performance analytics

**Route prefix (planned):** `/agent` · `/agent/leads` · `/agent/listings` · `/agent/calendar`

---

## 5. Agency ERP

**Purpose:** Run entire agencies

**Features**

- Agency dashboard
- Team, branch, recruitment
- Payroll, commissions
- Property portfolio
- Revenue analytics, financial reports, KPI monitoring
- Trust score
- Compliance center

**Route prefix (planned):** `/agency` · `/agency/team` · `/agency/leads` · `/agency/properties`

**Current app (partial):** `/agency/*` shells exist with demo data

---

## 6. Property management system (PMS)

**Purpose:** Manage buildings and tenants

**Features**

- Property portfolio
- Tenant management
- Lease management
- Maintenance, vendors, work orders
- Inspection reports
- Rent collection, expense tracking
- Occupancy monitoring
- Financial reporting

**Route prefix (planned):** `/manage` · `/manage/tenants` · `/manage/maintenance`

---

## 7. Smart property platform

**Purpose:** Connect physical buildings

**Features**

- Devices: locks, cameras, sensors, HVAC, lighting, solar, water, energy
- Occupancy detection
- Device management
- Automation engine (IF/THEN rules)
- AI automation builder

**Route prefix (planned):** `/smart` · `/smart/devices` · `/smart/automation` · `/smart/alerts`

---

## 8. Financial services platform

**Purpose:** Revenue generator — money flows through the OS

**Products**

- Mortgage marketplace (bank competition)
- Escrow (accounts, release conditions, milestones)
- Rent collection
- Property insurance
- Agent payments & commission settlement
- Property financing
- Embedded banking

**Route prefix (planned):** `/finance` · `/finance/mortgages` · `/finance/escrow`

---

## 9. Real estate intelligence platform

**Purpose:** Data moat

**Features**

- Market intelligence: prices, rental trends, heatmaps, growth, forecasting
- Neighborhood scores
- AI valuation engine (current, future, rental potential)
- Investor analytics: cap rate, ROI, cash flow, appreciation

**Route prefix (planned):** `/intelligence` · `/intelligence/market` · `/intelligence/valuation`

---

## 10. Developer platform

**Purpose:** Serve real estate developers

**Features**

- Project management
- Unit inventory
- Construction tracking & progress photos
- Sales dashboard
- Buyer portal
- Investor updates
- Smart building setup

**Route prefix (planned):** `/developer` · `/developer/projects`

---

## 11. Enterprise asset management

**Purpose:** Institutional scale

**Users:** REITs, investment funds, governments, large developers

**Features**

- Multi-country portfolios
- Asset tracking
- Revenue & occupancy monitoring
- ESG reporting
- Investment analytics, risk analysis, forecasting

**Route prefix (planned):** `/enterprise` · `/enterprise/portfolio`

---

## 12. Trust & compliance platform

**Purpose:** Build trust

**Features**

- KYC, AML
- Agency, agent, listing verification
- Fraud detection, risk scoring
- Audit logs, reputation scores

**Route prefix (planned):** `/admin` · `/admin/agencies` · `/admin/moderation` · `/admin/audit`

**Current app (partial):** `/admin/*` shells exist with demo data

---

## AI layer — BaytMiftah AI

Capabilities across all modules:

| Capability | Platform(s) |
|------------|-------------|
| Property search AI | Marketplace |
| Pricing AI | Marketplace, Intelligence |
| Listing coach | Agent CRM |
| Agency assistant | Agency ERP |
| Buyer assistant | Buyer App |
| Tenant assistant | Renter App |
| Maintenance assistant | PMS |
| Market intelligence AI | Intelligence |
| Fraud detection AI | Trust |
| Smart building AI | Smart Property |
| Investment advisor | Buyer App, Intelligence |

**Backend (planned):** Supabase Edge Function `intelligence` + `listing-ai`

---

## Mobile apps

| App | Core features |
|-----|---------------|
| **Buyer** | Search, favorites, offers, messaging, documents |
| **Agent** | Leads, listings, calendar, CRM, commissions |
| **Agency** | Analytics, team, operations |
| **Owner** | Revenue, occupancy, maintenance |
| **Smart property** | Device control, alerts, automation |

**Current app:** Bolt-style shell at `/m/*` — buyer-oriented (home, explore, saved, messages, profile)

---

## Revenue streams

| Stream | Model |
|--------|--------|
| **SaaS** | Agent, agency, owner subscriptions |
| **Marketplace** | Featured listings, sponsored placements |
| **Financial** | Mortgage commissions, escrow fees, insurance commissions |
| **Smart property** | Device & automation subscriptions |
| **Enterprise** | Portfolio management licenses |
| **Data** | Market intelligence subscriptions, valuation API |

---

## Long-term vision (phases)

| Phase | Focus | Comparable |
|-------|--------|------------|
| **1** | Marketplace | Zillow / Property Finder |
| **2** | Agent CRM | Salesforce for real estate |
| **3** | Agency ERP | — |
| **4** | Property management | — |
| **5** | Financial services | Stripe for real estate |
| **6** | Smart buildings | Smart home + energy layer |
| **7** | Intelligence network | Data moat |
| **8** | Global infrastructure | Full OS |

---

## Current codebase status (snapshot)

| Platform | Status |
|----------|--------|
| Marketplace | **In progress** — home, map, listing detail, categories |
| Buyer app | **Partial** — saved, trips/viewings, documents shell |
| Renter app | Not started |
| Agent CRM | Not started |
| Agency ERP | **Shell** — dashboard, team, leads, properties, onboarding |
| PMS | Not started |
| Smart property | Not started |
| Financial services | Not started |
| Intelligence | Not started |
| Developer | Not started |
| Enterprise | Not started |
| Trust & compliance | **Shell** — admin verification, moderation, audit |
| AI layer | Not started (Edge Function stubs planned) |
| Mobile | **Partial** — Bolt-style buyer shell |

**Backend:** Supabase Edge Functions scaffolded (`marketplace`, `bookings`, `auth`, `geo`, `messaging`, `agencies`, `moderation`, `persistence`) — deploy pending.

---

## Technical architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Clients                                                     │
│  Desktop (Airbnb UX) · Mobile (Bolt UX) · Future native apps │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  React app (Vite) — role-aware routes per platform           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase Edge Functions (API layer)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase Postgres · Auth · Storage · Realtime               │
└─────────────────────────────────────────────────────────────┘
```

---

## Next implementation priorities

1. **Phase 1 completion** — live listings, auth roles, list-property flow, comparison, neighborhood stub
2. **Phase 2 start** — agent CRM dashboard + lead pipeline
3. **Role-based routing** — send buyers, agents, agency, admin to correct home
4. **Deploy Supabase** — migrations + all Edge Functions
5. **Mobile agent app** — second mobile persona under `/m/agent`

See `docs/IMPLEMENTATION_ROADMAP.md` for phased delivery checklist.
