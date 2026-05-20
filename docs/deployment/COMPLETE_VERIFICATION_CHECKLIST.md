# BaytMiftah Complete Verification Checklist

Last updated: May 18, 2026

This checklist separates local implementation from production launch readiness. A checked local feature does not mean BaytMiftah is legally or operationally ready to launch with live money, identity verification, SMS, or IoT devices.

## Current Repo Verification

| Area | Local Status | Verification |
| --- | --- | --- |
| Phase 1 SaaS | Complete locally | `npm run qa:local` passed after the current payment fallback work and release hardening pass. |
| Phase 2 Marketplace | Complete locally | Listings, discovery, live tile-map search, inquiries, viewings, messaging, reporting, moderation, and analytics surfaces are present. |
| Phase 3 Escrow and Trust | Complete locally | Paystack/Stripe-ready escrow lanes, document gates, disputes, release/refund, receipts, and internal integrity logs are wired. |
| Phase 4 Smart Access | Foundation complete locally | Device registry, grants, commands, audit rows, workspace/user UI, and provider-neutral hooks exist. |
| Payment fallback | Complete locally | Property checkout tries the selected provider first and falls back to configured secondary providers by currency. |
| External chain dependencies | Removed | No external chain, token, wallet, or contract dependencies remain in `src`, `supabase`, or `docs`. |

## Must Pass Before Any Public Launch

| Check | Owner | Target | Status |
| --- | --- | --- | --- |
| `npm run typecheck` | Engineering | Every release | Passing locally. |
| `npm run test` | Engineering | Every release | Passing locally. |
| `npm run build` | Engineering | Every release | Passing locally. |
| `npm run release:check` | Engineering | Every release | Passing locally. |
| E2E/browser smoke tests | Engineering | May 25, 2026 | Passing locally. Playwright covers auth entry, marketplace search/detail, buyer requests, workspace billing, admin escrow, and mobile widths. |
| Mobile viewport QA | Engineering/QA | May 25, 2026 | Passing locally for 375px mobile, tablet, and standard desktop smoke paths. Expand only if new breakpoint-specific regressions appear. |
| GitHub Actions CI | Engineering | May 18, 2026 | Configured locally in `.github/workflows/ci.yml` with Playwright browser install and smoke coverage; verify remote run after push. |
| Production env audit | Engineering/Ops | May 22, 2026 | Tooling complete locally. `scripts/checkProductionEnv.cjs` and `npm run release:check` now flag placeholders/test keys and validate optional MapTiler config when selected; verify deployed secrets in each production environment before launch. |
| Security headers and CSP | Engineering/Security | May 29, 2026 | Configured locally in Vite dev/preview and `vercel.json`; verify deployed response headers after the next push. |
| Backup and restore drill | Engineering/Ops | May 29, 2026 | Pending. Run and document a restore test. |
| Launch readiness control plane | Engineering/Product/Ops | May 19, 2026 | Complete locally. Remaining legal, backup, provider, data, IoT, SMS/USSD, referral, fraud, construction, and monetization workstreams now have auditable tables and service helpers for status/evidence tracking. |

## Payment Launch Checklist

| Check | Owner | Target | Status |
| --- | --- | --- | --- |
| Paystack live account approved | Finance/Ops | May 29, 2026 | Pending external setup. |
| Stripe live account approved | Finance/Ops | May 29, 2026 | Pending external setup. |
| Flutterwave/local fallback account approved | Finance/Ops | June 5, 2026 | Pending external setup if enabled. |
| Gateway fallback order approved | Product/Finance | May 22, 2026 | Pending business decision. Current default: Paystack for GHS, Stripe for USD/GBP/EUR, then configured secondary providers. |
| Webhook endpoints registered | Engineering/Ops | June 1, 2026 | Pending production dashboard setup. |
| Webhook signatures tested | Engineering/Ops | June 3, 2026 | Pending provider sandbox evidence. |
| Duplicate webhook idempotency tested | Engineering/Ops | June 3, 2026 | Local tests exist; provider sandbox proof pending. |
| Provider sandbox evidence ledger | Engineering/Ops | May 19, 2026 | Complete locally. `provider_sandbox_events` tracks successful payments, failures, duplicate webhooks, renewals, refunds, chargebacks, transfers, fallback, IoT commands, SMS, USSD, identity, and registry checks. |
| Subscription plan IDs configured | Finance/Ops | June 1, 2026 | Pending production secrets. |
| Payout/transfer recipient setup | Finance/Ops | June 5, 2026 | Pending per-organization production setup. |
| Refund and chargeback runbook | Finance/Ops/Support | June 5, 2026 | Pending operations signoff. |
| Escrow fee and FX policy | Product/Finance/Legal | May 22, 2026 | Pending business/legal decision. |

## Compliance Launch Checklist

| Check | Owner | Target | Status |
| --- | --- | --- | --- |
| Counsel-approved Terms, Privacy Policy, Escrow Terms, and Refund Policy | Legal/Product | May 29, 2026 | Pending legal signoff. |
| Data Protection Commission registration/category confirmed | Legal/Ops | May 29, 2026 | Pending legal/ops confirmation. |
| DPIA for identity, documents, AI, fraud scoring, and biometrics | Legal/Security | June 5, 2026 | Pending. |
| KYC/AML operating model | Legal/Finance/Ops | May 29, 2026 | Pending. Must match final role and payment structure. |
| Ghana Card/liveness vendor selected | Product/Ops | June 5, 2026 | Pending. |
| Official business/property verification SOP | Legal/Ops | June 5, 2026 | Pending. |
| Title and ownership disclaimer wording | Legal/Product | May 29, 2026 | Pending counsel-approved wording. |
| SMS/USSD consent and opt-out process | Legal/Ops/Engineering | June 12, 2026 | Pending provider/legal setup. |
| IoT safety, privacy, and support policy | Legal/Ops/Engineering | June 12, 2026 | Pending before live device use. |

## Competitive Moat Launch Checklist

| Feature | Owner | Target | Local Status | Production Gap |
| --- | --- | --- | --- | --- |
| Hyperlocal flood and area intelligence | Product/Data | June 12, 2026 | Partly built | Add trusted data feeds and source confidence labels. |
| Power/water reliability | Product/Data | June 19, 2026 | Not live | Add provider/manual data pipeline and disclosure rules. |
| Ghana Card verification | Product/Ops/Engineering | June 19, 2026 | Product surface only | Add vendor integration, consent, DPIA, and manual review. |
| SMS booking | Product/Engineering/Ops | June 26, 2026 | Not live | Add short code/provider, parser, opt-out, and abuse controls. |
| USSD payments | Product/Finance/Engineering | July 3, 2026 | Not live | Add PSP/USSD partner and payment handoff. |
| Weekly/daily payments | Product/Finance/Legal | July 3, 2026 | Not live | Requires legal and licensed partner review. |
| Community chats/events | Product/Trust & Safety | July 10, 2026 | Not live | Add moderation, reporting, and privacy controls. |
| Land Registry/Lands Commission checks | Legal/Ops/Product | June 19, 2026 | SOP pending | Add official/manual verification path where available. |
| AI investment score | Product/Data/Legal | July 10, 2026 | Foundation only | Add data governance, methodology, confidence, and risk warnings. |
| Referral rewards | Product/Finance/Trust & Safety | July 3, 2026 | Attribution foundation exists | Add reward ledger, approval, fraud controls, and payout policy. |
| Fraud prevention | Trust & Safety/Engineering | June 26, 2026 | Partly built | Add identity liveness, image authenticity, device risk, and investigation runbooks. |

## Smart Access Launch Checklist

| Check | Owner | Target | Status |
| --- | --- | --- | --- |
| TTLock/Yale/Tuya production credentials stored server-side | Engineering/Ops | June 12, 2026 | Pending. Workspace Smart Access now tracks non-secret readiness checks for vaulted credentials, webhook verification, and real-device testing. |
| Smart Access readiness evidence | Engineering/Ops | May 19, 2026 | Complete locally. Provider readiness rows and sandbox/device evidence records exist; live device credentials and real hardware tests are still external launch tasks. |
| Lock command Edge Function tested with real devices | Engineering/Ops | June 19, 2026 | Pending. |
| Code generation and revocation tested end-to-end | Engineering/QA | June 19, 2026 | Pending live provider test. |
| Emergency access process documented | Ops/Support/Legal | June 19, 2026 | Pending. |
| Tenant move-out revocation SOP | Ops/Support/Legal | June 19, 2026 | Pending. |
| Device offline fallback messaging verified | Engineering/QA | June 19, 2026 | Pending. |
| Entry log retention and privacy policy wording approved | Legal/Product | June 19, 2026 | Pending. |

## Release Evidence To Keep

| Evidence | Owner | Due | Location |
| --- | --- | --- | --- |
| QA command output | Engineering | Every release | Release notes or CI artifacts. |
| Provider sandbox screenshots/logs | Ops/Engineering | Before live payments | Use `docs/operations/PRODUCTION_EVIDENCE_PACKET.md` as the evidence template. |
| Legal signoff versions | Legal/Product | Before public launch | Use `docs/legal/LAUNCH_POLICY_SIGNOFF_PACKET.md` as the review packet. |
| Security audit report | Security/Engineering | Before public launch | Internal security folder. |
| Backup/restore proof | Ops/Engineering | Before public launch | Use `docs/operations/PRODUCTION_EVIDENCE_PACKET.md` as the drill template. |
| Payment incident runbook | Finance/Ops/Support | Before live payments | Use `docs/deployment/PRODUCTION_PROVIDER_ACTIVATION.md` plus the evidence packet. |
| IoT device test logs | Ops/Engineering | Before live devices | Use `docs/operations/PRODUCTION_EVIDENCE_PACKET.md` as the device test template. |

## Priority Order

| Priority | Workstream | Why It Comes First |
| --- | --- | --- |
| 1 | CI and repeatable QA | Every later change needs an automatic quality gate. |
| 2 | Production env audit and provider sandbox tests | Live payments, notifications, and IoT cannot be trusted until secrets and callbacks are proven. |
| 3 | Legal/compliance signoff | Escrow, identity, SMS, AI, and IoT have external obligations that code cannot solve alone. |
| 4 | E2E/mobile viewport testing | The app is mobile-first and payment-heavy, so critical journeys need browser proof. |
| 5 | Security hardening and backup restore drill | Launch readiness depends on incident prevention and recovery, not only features. |
