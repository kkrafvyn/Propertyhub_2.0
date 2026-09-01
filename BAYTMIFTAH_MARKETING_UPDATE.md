# BaytMiftah — Marketing Website Update

**Date:** 2026-09-01  
**Scope:** Public marketing site at `baytmiftah.com` (within existing Vite monorepo)  
**Build:** `npm run typecheck` ✅ · `npm run build` ✅ · `site-mode.test.ts` ✅

---

## 1. Audit — current state (before this update)

| Area | Finding |
|------|---------|
| Framework | Vite + React + TypeScript + Tailwind v4 (single SPA) |
| Separate marketing repo | **Not present** — marketing lives in the same codebase as the product app |
| `/` route | Served `Home.tsx` (marketplace listings), not a marketing page |
| Hostname split | **Not implemented** — `baytmiftah.com` vs `app.baytmiftah.com` was architecture-only |
| SEO | Basic `PageMeta`; `index.html` description was consumer-marketplace focused |
| `robots.txt` / `sitemap.xml` | **Missing** |
| Navigation | `DesktopShell` marketplace nav (search, compare, list property) |
| About / contact / careers | **Exist** at `/about`, `/contact`, `/careers` via `StaticContentPage` |
| Explorer | **Implemented** at `/explorer` (`PublicEventLedger`) |
| Paystack references | Legacy fallbacks in edge code; marketing copy uses PayAngels positioning |
| Fake metrics / testimonials | None added in prior homepage |

**Preserved:** Product app routes, workspace, consumer marketplace (`Home.tsx` on app subdomain), legal pages, explorer, auth flows.

**Removed from marketing path:** Marketplace listing grid as the apex homepage (still available on `app.baytmiftah.com` and `/search`).

---

## 2. Architecture decision

Marketing and product remain **one deployable SPA** with **hostname-based mode**:

| Host | `/` serves |
|------|------------|
| `baytmiftah.com` / `www.baytmiftah.com` | `MarketingHome` |
| `app.baytmiftah.com` | `Home` (marketplace) |
| `localhost` (default) | `Home` (dev marketplace) |
| `localhost` + `VITE_SITE_MODE=marketing` | `MarketingHome` |

CTAs on the marketing site link to **`VITE_APP_ORIGIN`** (default `https://app.baytmiftah.com`).

This matches the frozen architecture without a second repository or duplicate build pipeline.

---

## 3. Changes made

### New files

| File | Purpose |
|------|---------|
| `src/lib/site-mode.ts` | Hostname / env site mode detection |
| `src/lib/site-mode.test.ts` | Unit tests for mode resolution |
| `src/lib/marketing-urls.ts` | App vs marketing origin helpers |
| `src/app/pages/ConsumerIndex.tsx` | Routes `/` to marketing or marketplace |
| `src/app/pages/marketing/MarketingHome.tsx` | Full marketing page (all sections) |
| `src/app/components/marketing/MarketingShell.tsx` | Sticky nav + premium footer |
| `src/app/components/marketing/marketing.css` | Marketing design layer |
| `public/robots.txt` | Crawl rules + sitemap pointer |
| `public/sitemap.xml` | Core marketing + app search URLs |

### Updated files

| File | Change |
|------|--------|
| `src/app/routes/consumer.routes.tsx` | Index → `ConsumerIndex` |
| `src/app/components/Root.tsx` | Marketing `/` on mobile skips marketplace shell |
| `index.html` | REOS-focused meta + Open Graph + Twitter tags |
| `.env.example` | `VITE_APP_ORIGIN`, `VITE_SITE_MODE` |
| Brand wordmark (prior fix) | `BAYTMIFTAH` Latin A’s in logo/splash |

### Page sections implemented

1. Hero — REOS headline, problem statement, CTAs, illustrative product cards  
2. Problem — fragmented tools → unified system  
3. Workflow — Discover → … → Automate  
4. Business — six capability areas + workspace / demo CTAs  
5. Consumer — journey steps + explore CTA  
6. AI — governed operational pipeline (no unrestricted autonomy claims)  
7. AI Night Watch — illustrative alert panel (labeled **Illustrative UI**)  
8. Trust — permission / audit chain  
9. Public explorer — Event Ledger with privacy caveat  
10. Teams — role-aware org tree  
11. Desktop + mobile — work pattern split  
12. Closing CTA + premium footer  

---

## 4. Design decisions

- **Visual identity:** Forest green `#0F2922`, ivory background, Playfair display + Inter — reused from existing `theme.css`
- **No new npm dependencies** — CSS-only scroll reveals, `IntersectionObserver`, existing Lucide icons
- **No stock hero photo** — product-style cards with **Illustrative UI** badges
- **No fake customer counts, logos, testimonials, or uptime claims**
- **`prefers-reduced-motion`** — reveal animations disabled
- **Copy rule:** “Run your real-estate business from one system” — not “we manage your properties”

---

## 5. Features represented (evidence classification)

| Claim | Status | Evidence |
|-------|--------|----------|
| Property discovery / search | IMPLEMENTED | `PropertySearch`, consumer routes |
| Leasing / applications | IMPLEMENTED | `PublicLeaseApplication`, lease workflows |
| Workspace operations | IMPLEMENTED | `WorkspaceLayout`, estate operations pages |
| Finance / GL / reconciliation | IMPLEMENTED | Migrations + `BankReconciliation`, journal entries |
| Maintenance / gate clearance | IMPLEMENTED | `GateClearanceKiosk`, maintenance services |
| CRM / contacts / leads | IMPLEMENTED | `WorkspaceContacts`, `LeadManagement` |
| Communications | IMPLEMENTED | Messaging, notifications, SMS edge |
| PayAngels payments | IMPLEMENTED | Edge functions; not custodian (legal copy) |
| AI assistant | PARTIAL | `ai-assistant` edge; org kill switch in DB |
| AI Night Watch | IMPLEMENTED | `scripts/workers/night-watch-audit.mjs`, `AICommandCenter` |
| Public Event Ledger | IMPLEMENTED | `/explorer`, `verify_public_transaction` RPC |
| Role-aware workspace | IMPLEMENTED | `workspace-permissions.ts`, role nav |
| Mobile + desktop shells | IMPLEMENTED | Capacitor + Electron shells |
| E-sign production provider | NOT FOUND | Simulation stub only — **not advertised** |
| docs/status/blog subdomains | PLANNED | Footer notes “coming soon”, no broken links |

---

## 6. Claims removed or avoided

- “We manage your properties for you”
- Guaranteed rental income / investment returns
- Fake occupancy or revenue statistics (demo cards labeled illustrative)
- Certification badges (SOC 2, ISO, etc.)
- Paystack as primary payment brand on marketing copy
- AI autonomously acting without permissions

---

## 7. SEO changes

| Item | Update |
|------|--------|
| `<title>` | BaytMiftah (PageMeta sets full REOS title on `/`) |
| Meta description | Real-estate operating system positioning |
| Open Graph | Title + description on marketing home |
| Twitter card | `summary_large_image` in `index.html` |
| Canonical | Via `PageMeta` + `VITE_SITE_URL` |
| `robots.txt` | Added |
| `sitemap.xml` | Added (marketing + `/explorer` + app search) |

Keywords used naturally: real estate operating system, property operations, property management platform — not stuffed.

---

## 8. Performance

- Marketing page lazy-loaded via `ConsumerIndex` chunk (~11 KB gzip)
- No animation libraries added
- CSS scoped to `.marketing-page`
- Product cards are DOM-only (no large images)
- Build succeeds; no new bundle-size regressions beyond marketing chunk

---

## 9. Accessibility

- Semantic `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`
- Heading hierarchy: one H1 in hero, H2 per section
- Nav keyboard focus styles on links and buttons
- Mobile menu: `aria-modal`, `aria-expanded`, backdrop dismiss
- Logo link `aria-label="BaytMiftah"`
- Reduced motion respected for scroll reveals

---

## 10. Deployment configuration

### Vercel (recommended split)

| Project | Domain | `VITE_SITE_MODE` |
|---------|--------|------------------|
| Marketing | `baytmiftah.com` | unset (hostname auto) |
| App | `app.baytmiftah.com` | unset |

Local marketing preview:

```bash
VITE_SITE_MODE=marketing npm run dev
```

### Env vars

```env
VITE_SITE_URL=https://baytmiftah.com
VITE_APP_ORIGIN=https://app.baytmiftah.com
```

---

## 11. Test results

```text
npm run typecheck     → pass
npm run build         → pass
npm run test -- src/lib/site-mode.test.ts → pass (3 tests)
```

Not run this session: full vitest suite, Playwright e2e, Lighthouse (recommend before launch).

---

## 12. Remaining issues

| Item | Priority |
|------|----------|
| Two Vercel projects or hostname routing in one project | P5 deploy |
| `VITE_SITE_MODE=marketing` not set in `.env` locally — use env or hosts file to preview | Dev UX |
| Marketing OG image asset not added | SEO polish |
| AI dedicated legal policy page | P6 legal |
| `docs.baytmiftah.com` / `status.baytmiftah.com` | Post-launch |
| Production audit restore (CI, RLS, tenant secrets) | Separate track — see `BAYTMIFTAH_RISK_REGISTER.md` |

---

## 13. Production sequence (not started here)

When you are ready for the audit remediation track:

1. Commit/push CI + native restore + `2026090202`
2. Green CI on `main`
3. Apply RLS; prove analyst cannot write listings
4. Configure tenant-isolation GitHub secrets
5. Vercel/DNS (marketing + app origins) + PayAngels + Resend

Say when to start that work — it was intentionally not bundled into this marketing UI pass.

---

*Marketing site accurately represents implemented REOS capabilities. Illustrative UI is labeled. No fabricated social proof.*
