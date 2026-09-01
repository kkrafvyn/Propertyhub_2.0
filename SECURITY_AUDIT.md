# BaytMiftah Security Audit

Date: 2026-08-27
Scope: Repository-only review of the React/Vite client, Supabase migrations and Edge Functions, payment/bank-feed/AI services, storage, mobile/desktop targets, CI, and tests.

## Executive Summary

BaytMiftah has a substantial security foundation, but it is not yet production-security complete. The repository verifies several important controls, including publishable-key-only client configuration, protected Edge Function service-role usage, PayAngels signature and provider-status verification, immutable wallet ledger triggers, private sensitive buckets, Electron sandboxing, and baseline CI.

The audit identified one **CRITICAL** issue and several **HIGH** issues that must be fixed or explicitly accepted before live financial and enterprise use. Local environment files also contain credential-shaped values and must be treated as compromised and rotated outside this repository. The values are not reproduced in this document.

## 1. Current Architecture

- React 19 + TypeScript + Vite client.
- React Router route trees for Consumer, Business Platform, and compatibility admin routes.
- Supabase Postgres, Row Level Security, Storage, and Edge Functions.
- Shared service layer in `src/lib` and server-side integration boundaries in `supabase/functions`.
- Capacitor Android/iOS mobile wrappers and Electron desktop wrapper.
- Two mobile products: Consumer Mobile and Business Mobile. Admin access is role-protected inside the shared products.
- AI assistant/orchestration with server-side Edge Function boundaries.

## 2. Authentication Model

Verified:

- Supabase Auth is the identity provider.
- Client authentication uses the publishable/anonymous key in `src/lib/supabase.ts`.
- Protected routes require an authenticated user.
- Platform admin routes check `is_platform_admin` or `adminService.isPlatformAdmin`.
- Workspace routes can require verified email.
- MFA assurance is checked for platform-admin and workspace-sensitive flows.
- Session tracking and idle timeout code exist.

Not fully verified:

- Complete new-device detection and user-visible alerting.
- Reauthentication on every sensitive account and financial change.
- End-to-end revocation evidence across all devices.

## 3. Authorization Model

Verified:

- Frontend route gates exist, but they are not considered a security boundary.
- Supabase RLS policies and server-side Edge Function auth checks exist in many areas.
- Platform admin authorization is distinct from ordinary organization membership in the main admin guard.

Risks:

- Several policies and functions use membership checks without role/permission checks.
- Authorization is not uniformly centralized across every service and resource.
- A customer organization admin must remain distinct from a BaytMiftah platform admin; this requires continued database-level testing.

## 4. Tenant Isolation Model

The data model uses organization relationships across properties, units, leases, payments, maintenance, documents, messages, bank feeds, and operations. RLS commonly resolves access through `organization_members`.

Not yet proven:

- A complete positive/negative cross-tenant test suite against a real Supabase database.
- Every indirect relationship is checked for the same organization before read/write.
- Reports, exports, search, AI, notifications, and Storage have complete cross-tenant regression proof.

## 5. Sensitive Data

- Identity and KYC documents and fields.
- Payment references, receipts, wallet and ledger records.
- Bank account and bank-feed connection metadata.
- Leases, contracts, signatures, tenant messages, maintenance evidence, and property documents.
- API/provider credentials and database connection credentials in deployment environments.
- AI prompts, document content, and operational history.

## 6. External Integrations

- PayAngels payment and refund flows.
- MTN MoMo collection/disbursement flows.
- Bank-feed provider boundaries.
- Resend, Twilio, Arkesel/Hubtel-style messaging boundaries.
- Configurable LLM provider boundary.
- Supabase Auth, Postgres, Storage, and Edge Functions.

Verified: PayAngels webhook signature verification, provider re-verification, and webhook replay uniqueness are present.

## 7. Secrets

- Client code uses publishable Supabase credentials.
- Server-side provider credentials are read from Edge Function environment variables.
- `.gitignore` excludes local env, payment env, backups, and local Supabase files.
- Credential-bearing local files were found in the working tree. Their values are intentionally not copied here. Rotate database, payment, and any other exposed credentials immediately and verify that no such file has ever been committed.
- Secret rotation procedures and CI secret scanning are not yet evidenced.

## 8. AI Permissions

Verified:

- AI calls are routed through Edge Functions and rate-limit helpers.
- The product describes controlled AI capabilities and permission boundaries.

Gaps:

- A complete allowlisted tool registry with a server-side organization/resource authorization check for every tool is not proven.
- Prompt-injection tests are not present.
- PII minimization, provider retention configuration, and AI action audit completeness are not proven.
- Arbitrary SQL must remain unavailable to AI; this requires regression tests across all AI paths.

## 9. Financial Operations

Verified:

- Wallet ledger uniqueness/idempotency indexes and immutability triggers exist.
- PayAngels success webhooks re-verify provider state.

Gaps:

- MTN MoMo webhook authenticity and provider re-verification are missing.
- Payment reconciliation side effects are not visibly enclosed in one database transaction/locking boundary.
- Step-up authentication and approval evidence for every high-risk refund, payout, bank-account, and bulk operation are not fully proven.

## 10. Storage Security

Verified:

- KYC, maintenance media, and receipts use private buckets with scoped policies.
- Upload size/MIME validation exists in client/server helpers.

Risks:

- `property-media` is globally public and can expose media for unlisted/deleted properties if paths are known.
- `organization-assets` accepts public SVG uploads; SVG is an active content format and should be prohibited or sanitized before public serving.
- Magic-byte/content inspection and malware quarantine are not proven.

## 11. Existing Audit Mechanisms

- `audit_logs` and a `write_audit_log` RPC exist.
- Webhook replay events are recorded.
- Security/session tracking exists.

Risk:

- The audit RPC is callable by all authenticated users and accepts caller-provided action/entity/details, so audit integrity is not yet sufficient for a defensible append-only record.

## 12. Findings

### CRITICAL

- **Unauthenticated MTN MoMo webhook (REMEDIATED 2026-08-27 / confirmed 2026-09-01).** `supabase/functions/momo-webhook/index.ts` now requires HMAC validation and provider re-query before mutating payment or contractor payout state. Treat remaining MoMo risk as configuration of production secrets, not missing code.

### HIGH (historical — remediated in `2026082701_security_remediation.sql`)

- KYC review fields are admin-controlled; submitters can insert/read own rows only.
- Bank-feed connections are restricted to finance-capable organization roles.
- Client `write_audit_log` grant was revoked; audit writes are trusted-path only.

Remaining HIGH-adjacent items:

- **Credential-bearing local env files exist.** They are ignored by Git, but presence still requires immediate rotation and verification of repository history.
- **Step-up / break-glass** is now implemented (`privileged_step_up` + `stepUpAuthService`) but must be called from every high-risk payout/refund UI path before production sign-off.

### MEDIUM

- **Rate limiting fails open.** Edge Functions continue when the rate-limit RPC errors. **Updated 2026-09-01:** `_shared/rate-limit.ts` fails closed with 503; confirm production functions are deployed.
- **Public property media may outlive listing authorization.** The bucket is public and read policy is not tied to listing visibility/lifecycle.
- **Public organization SVG uploads create active-content risk.** Public SVG should be disallowed unless transformed to a safe raster asset.
- **Payment reconciliation has distributed side effects.** Replay protection exists, but concurrent processing and partial failures need transaction/locking evidence.
- **AI document/provider data handling.** PII redaction (`src/lib/pii-redaction.ts`) and an org-level tool allowlist/kill switch now exist; prompt-injection tests and provider retention contracts remain open.
- **Cross-tenant security tests skip without fixtures.** `tenant-isolation.test.ts` activates when `VITE_SUPABASE_TEST_*` secrets are configured.

### LOW

- **Release security evidence is incomplete.** Signing, release approval, certificate rotation, and mobile production logging controls are not evidenced in the repository.
- **Backup restore evidence is incomplete.** Scripts and guidance exist, but a successful isolated restore test and measured RPO/RTO are not present.

## 13. Recommended Remediation

1. Rotate all credentials found in local env files; verify Git history and CI logs.
2. Require MTN MoMo callback authentication where supported and always re-query the provider before mutating state.
3. Replace broad KYC self-management with insert/read-own plus server/admin-controlled review updates.
4. Restrict bank-feed connections and sync to explicit finance/owner/manager permissions.
5. Move audit insertion behind trusted server-side routines with constrained event types and append-only controls.
6. Make rate-limit failures closed for abuse-sensitive endpoints, with a deliberate availability exception only when documented.
7. Prohibit public SVG uploads and classify public property media explicitly.
8. Add tenant-isolation, webhook forgery/replay, privilege-escalation, storage, AI, and payment security tests.
9. Establish and test backups, recovery, incident response, retention, CI secret/dependency scanning, and release controls.
10. Arrange independent penetration testing before enterprise rollout.

## 14. Verification Status

Verified in repository:

- TypeScript/unit-test/CI baseline exists.
- PayAngels webhook signature and provider-status verification.
- Wallet ledger idempotency and immutability controls.
- Private sensitive storage buckets.
- Client does not contain a Supabase service-role key.
- Electron context isolation, no Node integration, and sandboxing.

Not verified from repository alone:

- Production Supabase policy state after migration deployment.
- Credential rotation or secret history cleanliness.
- Real tenant-isolation behavior against deployed RLS.
- Provider-specific MTN MoMo callback authenticity contract.
- Successful backup restoration, RPO/RTO, monitoring coverage, penetration test results, and legal/counsel sign-off.

## 15. Severity Meaning

- **CRITICAL:** exploitable path to unauthorized financial, identity, privilege, or tenant compromise; block live launch.
- **HIGH:** serious authorization, integrity, or sensitive-data weakness requiring remediation before production.
- **MEDIUM:** meaningful defense-in-depth or operational risk requiring scheduled remediation and verification.
- **LOW:** limited impact or evidence/documentation gap that should be addressed for mature operations.
