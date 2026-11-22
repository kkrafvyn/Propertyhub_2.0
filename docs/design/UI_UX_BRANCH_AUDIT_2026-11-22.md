# BaytMiftah UI/UX upgrade — branch vs main
Date: 2026-11-22

Compared refs: `main` and `feat/mobile-booking-ux-dm-hardening-20261122` (draft PR #42).

## Guardrails
- Existing approved BaytMiftah logo and asset files stay untouched.
- Existing `src/styles/theme.css` brand tokens stay untouched: forest `#123B2A`, terracotta `#B64F3A`, gold `#D4A342`, cream `#FAF8F5`.
- A visual redesign does not make integrations, financial statements, property verification or AI automation more trustworthy than the backing data.

## UI/UX upgrades on this branch

| Area | Change | User impact |
|---|---|---|
| Consumer mobile homepage | Transaction-aware shortcut filters; market-price guidance; inquiry CTA; truthful organization badge and missing image state | Faster discovery, less ambiguous listings |
| Property details | Separate fee disclosure, accurate provider-checkout status, valid claim-property link, no false escrow guarantee | Clearer transaction decisions |
| Short-stay booking | UTC calendar-day math, future date/guest validation, blocked-date and request-failure feedback; transparent nightly subtotal | Prevents invalid dates and surprise costs |
| Search results | In-page load error/retry preserving filters, correct price currency in list view, accessible pagination | Users can recover without losing filters |
| Consumer messages | Restores unsent drafts, shows error feedback, honest persisted-message indicator, message labels, removes unverified AI/online claims | Prevents lost text, improves trust |
| Business dashboard | Explicit Refresh and role-preview labeling, remove unsupported 'live updates' badge | Clearer data freshness |
| CRM and team inbox | Search by prospect/title/email, selected-thread indication | Faster lead triage |
| Owner statements and payouts | Counts only confirmed reference-backed disbursements, accurate approval/channel wording, scrollable mobile tabs | Avoids claiming unpaid statements are disbursed |
| Admin | Responsive sidebar-to-top navigation, keyboard skip link, valid site link | Better use on tablets and with keyboard |
| Sign-up | Consumer vs landlord/agency route selection, connected form labels and inline password match feedback | Reduces signup mistakes |
| Supporting CI tests | Correct DM static test source-path resolution; updated stale marketing preview assertion; repaired lease payment rail labeling | Clearer regression evidence |
| Security tooling | Upgrade vulnerable `certifi` in bundled `uv.lock` to PyPI-verified 2026.10.18 package hashes | Addresses security scanner critical finding |

## Backend and integrity findings

| Priority | Finding | Status |
|---|---|---|
| P0 | Realtime messages were broadcast via public-capable channels; full message payloads must never be trusted from client Broadcast | Private channel + member RLS and Postgres-authoritative delivery on branch. **Staging migration and live negative tests required** |
| P0 | Message sender/conversation identity could be mutable under client UPDATE permissions | Immutable identity trigger on branch; integration test required |
| P0 | Owner statements could be labeled paid without confirmed payout proof | Updated UI and mapper requires delivered status and payout reference; regression test |
| P0 | Invalid same-day/reverse stay dates silently counted as one night | Corrected UI, reservation service and booking helper; regression tests |
| P1 | Saved reservation followed by failed legal-acceptance write could surface as a failed reservation and encourage duplicates | Legal acceptance moved before booking creation. **Database idempotency still recommended** |
| P1 | Search performs all filtering, sorting and paging client-side after fetching listed inventory | Not fixed; plan indexed Postgres RPC (accurate counts, currency-aware price order) |
| P1 | Realtime typing and reaction broadcasts are client-supplied and cannot prove sender identity | Not fully fixed; restrict and validate payloads or obtain server-sourced status |
| P1 | Public marketplace DMs may bypass interpersonal blocked-user semantics, unlike workspace-DM RPC | Not fixed; server-level block enforcement and integration tests needed |
| P1 | Direct client message writes have no demonstrated per-user spam rate-limit gate | Not fixed; implement server-side throttling |
| P1 | Mixed currency revenue and pipeline figures in workspace need per-currency aggregation | Not fixed; avoid combined totals without conversion rules |
| P1 | External PayAngels end-to-end contract/certification, webhook replay protection and legal sign-off | Not verified; cannot call payment flow production-ready |
| P2 | Listing map fallback uses approximate city coordinate plus ID jitter, which can be mistaken for exact location | Needs explicit approximate-location designation |
| P2 | Automation states and online labels appear in older marketing/workspace surfaces | Spot-check all modules for misleading claims |
| P2 | Native screenshots, offline behaviour, accessible focus/contrast and screen-reader navigation | Device/browser acceptance testing required |

## Verification status
- Previous PR #42 CI: build and typecheck succeeded, 3 test files had failures (2 failing tests + 1 test import suite), plus a critical `certifi` scan. Specific source-level fixes were committed after that run.
- Tests were added for booking calendar days and payout state classification.
- **Latest revised CI may be queued/running. Do not mark this PR ready until CI and security checks pass.**
- No database migration was executed; no live pen test, payment certification, App Store submission or production deployment was performed.

### Release gates
1. Apply both messaging migrations to staging and inspect **all** `realtime.messages` policies. Test unauthorized access with three separate accounts and isolated organizations.
2. Run typecheck, full unit suite, security tests and build on the final commit, and resolve all newly discovered test failures.
3. Test booking invalid/reversed/past dates, fees, legal acceptance, availability and conflict handling against real staging data.
4. Test statement delivery vs payout proof, failed payouts, cross-currency dashboards, finance approval segregation.
5. Run Safari/iOS and Android acceptance checks for screens, keyboard, VoiceOver/TalkBack and dark mode.
6. Merge and deploy only after operator review, backup and smoke checks.

### Follow-up UI waves
- Full-screen image gallery and sticky mobile inquiry CTA with backend-based cost breakdown.
- Server-side, indexed listing search and map pins clearly identified as approximate where required.
- Unified inbox composer with retry/idempotency and verified delivery status.
- Admin moderation triage with filters and keyboard-shortcut support.
- Portfolio finance views grouped per currency, never additive across unconverted currencies.
- Accessibility audits of remaining account and workspace page modules.
