# BaytMiftah — Domain & Subdomain Architecture

> **Status:** Canonical reference — approved architecture
> **Last Updated:** 2026-08-30
> **Decision:** Keep domain structure simple. Two initial launch targets. Supporting subdomains added only when each service exists.

---

## High-Level Structure

```
                         BAYTMIFTAH
                              │
                  ┌───────────┴───────────┐
                  │                       │
             PUBLIC WEB                 APP
                  │                       │
        baytmiftah.com              app.baytmiftah.com
                  │                       │
         Marketing website        One main application
                                  ├── Consumer
                                  ├── Business (Workspace)
                                  └── Platform Admin
```

---

## Full Subdomain Map

```
baytmiftah.com
│
├── app.baytmiftah.com           → Main BaytMiftah application
│
├── support.baytmiftah.com       → Customer support / Help Center
│
├── docs.baytmiftah.com          → Product documentation
│
├── status.baytmiftah.com        → System status / incidents
│
├── blog.baytmiftah.com          → Marketing content / SEO
│
└── explorer.baytmiftah.com      → Public Property / Unit / Transaction Explorer
```

---

## Subdomain Details

### `baytmiftah.com` — Main Public Website

**Purpose:** Marketing and company information

| Section | Content |
|---|---|
| Home | Hero, value proposition, key modules |
| Solutions | Role-based solution pages (Landlords, Tenants, Agents) |
| Pricing | Tier breakdown and plan comparison |
| About | Company, team, mission |
| Blog | Articles, insights (initially hosted here, moves to `blog.baytmiftah.com` later) |
| Docs | Documentation (initially hosted here, moves to `docs.baytmiftah.com` later) |
| Contact | Enquiry form |
| Book a Demo | Demo scheduling |
| Careers | Open positions |

**Deployment:** Separate Vercel project from the main app.

---

### `app.baytmiftah.com` — The Product

**Purpose:** The entire BaytMiftah product — one application, one URL.

The user's role determines the experience:

```
app.baytmiftah.com
│
├── /                  → Consumer (Property explorer, listings, search)
├── /workspace/:slug   → Business (Property management, CRM, finance, AI)
└── /admin             → Platform Admin (System management, analytics)
```

**Key principle:** No separate consumer/business/admin domains. Role-based routing inside one application.

**Deployment:** One Vercel project. Handles all three user experiences.

---

### `support.baytmiftah.com` — Help Center

**Purpose:** User-facing support

| Audience | Content |
|---|---|
| All users | FAQs, troubleshooting, how-to articles |
| Tenants | Lease queries, payment queries |
| Landlords | Account help, billing |
| Businesses | Onboarding, module guides |

> **Mental model:** "I'm having a problem."

**Launch trigger:** When support volume exceeds inline FAQ capacity.

---

### `docs.baytmiftah.com` — Documentation

**Purpose:** Technical and product documentation

| Section | Content |
|---|---|
| User guides | Consumer and tenant guides |
| Business guides | Workspace and module documentation |
| Admin docs | Platform administration |
| API reference | REST API, webhooks |
| AI docs | AI modules, prompts, outputs |
| Integration docs | Supabase, payment gateways, third-party |
| Developer docs | SDK, self-hosting |

> **Mental model:** "How does BaytMiftah work?"

**Launch trigger:** When API/developer access is opened to partners.

---

### `status.baytmiftah.com` — System Status

**Purpose:** Operational transparency for all users and businesses

```
BaytMiftah Status

Application        ● Operational
Database           ● Operational
Authentication     ● Operational
Payments           ● Operational
Messaging          ● Operational
Email              ● Operational
AI Services        ● Operational
File Storage       ● Operational

Scheduled Maintenance
  None scheduled

Incident History
  2026-08-15   Resolved   Payment gateway latency (23 min)
```

**Launch trigger:** Before onboarding first paying business clients. Businesses depend on BaytMiftah for daily operations — they need a status page.

---

### `blog.baytmiftah.com` — Content Engine

**Purpose:** Growth, SEO, and thought leadership

| Category | Content |
|---|---|
| Product | Feature announcements, release notes |
| Market | Ghana real estate insights, market reports |
| Guides | Property management best practices |
| AI | AI in real estate articles |
| Case studies | Customer success stories |
| Company | Team updates, milestones |

**Launch trigger:** When content production reaches consistent publishing cadence.

---

### `explorer.baytmiftah.com` — Public Transparency Layer

**Purpose:** Public-facing property, unit, and transaction verification.

**Example URL:**
```
explorer.baytmiftah.com/unit/BM-UNIT-1842
```

**Example unit page:**
```
UNIT BM-UNIT-1842

Property         Accra Heights, East Legon
Type             2-Bedroom Apartment
Floor            4th

STATUS
SOLD

Transaction      BM-TX-91A72C

Verification
✓ Property registered
✓ Transaction verified
✓ Blockchain anchored

Public History
────────────────────────────
2026-01-10   LISTED
2026-01-18   VIEWING COMPLETED
2026-02-01   RESERVED
2026-02-14   PAYMENT VERIFIED
2026-03-01   SOLD
```

**Privacy principle:** Only public-safe data is shown. All financial, personal, and business data remains inside `app.baytmiftah.com`.

**Launch trigger:** When blockchain verification and unit tracking are production-ready.

---

## Launch Priority

### Phase 1 — Launch Now

```
1. baytmiftah.com        → Marketing website
2. app.baytmiftah.com    → Full product application
```

### Phase 2 — Add as Operations Grow

```
3. support.baytmiftah.com    → Before first paying businesses onboard
4. status.baytmiftah.com     → Before first paying businesses onboard
5. explorer.baytmiftah.com   → When blockchain is production-ready
```

### Phase 3 — Add as Content Scales

```
6. docs.baytmiftah.com   → When API/developer access opens to partners
7. blog.baytmiftah.com   → When content team has consistent publishing cadence
```

---

## Deployment Architecture

### Option A — Recommended (Simple, current stage)

| Subdomain | Deployment |
|---|---|
| `baytmiftah.com` | Separate Vercel project (marketing site) |
| `app.baytmiftah.com` | One Vercel project (main application) |
| `support.baytmiftah.com` | Third-party: Crisp Help, Intercom, Notion |
| `status.baytmiftah.com` | Third-party: Betteruptime, Instatus, Upptime |
| `docs.baytmiftah.com` | Third-party: Mintlify, Docusaurus, GitBook |
| `blog.baytmiftah.com` | Third-party: Ghost, Hashnode, or Vercel |
| `explorer.baytmiftah.com` | New Vercel project when needed |

### Option B — Monorepo (when team scales)

All subdomains as separate `apps/` inside a single Turborepo, each deployed as its own Vercel project but sharing:
- Design tokens
- UI components
- Auth utilities
- Type definitions

---

## DNS Configuration Template

```
# Vercel / DNS Provider

# Root
baytmiftah.com           A      76.76.21.21  (Vercel IP)
www.baytmiftah.com       CNAME  cname.vercel-dns.com

# Main application
app.baytmiftah.com       CNAME  cname.vercel-dns.com

# Supporting (add when services exist)
support.baytmiftah.com   CNAME  [support service CNAME]
status.baytmiftah.com    CNAME  [status service CNAME]
docs.baytmiftah.com      CNAME  [docs service CNAME]
blog.baytmiftah.com      CNAME  [blog service CNAME]
explorer.baytmiftah.com  CNAME  cname.vercel-dns.com
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **One app domain** | Avoid user confusion between consumer/business/admin URLs |
| **Role-based routing** | Single sign-in, single URL — experience adapts to role |
| **Marketing separate** | Independent deploy cycles; no marketing change can break the app |
| **Status page early** | Business clients need operational SLA visibility before paying |
| **Explorer separate** | Public transparency must work without authentication |
| **Docs/Blog last** | Lower operational priority at launch; start as sections of `baytmiftah.com` |
| **Use third-party for support/status** | No need to build what existing products do better |
