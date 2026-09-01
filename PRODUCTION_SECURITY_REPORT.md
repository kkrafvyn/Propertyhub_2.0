# BaytMiftah Production Security Report

Date: 2026-08-27

## Security posture

- Authentication: Supabase Auth, protected routes, MFA checks, session timeout/tracking; complete reauthentication and device controls pending.
- Authorization: RLS and Edge Function checks exist; coverage is not uniformly proven.
- Tenant isolation: organization membership policies exist; deployed cross-tenant proof pending.
- Database: wallet immutability/idempotency exists; full table/policy audit pending.
- Storage: sensitive buckets are private; property-media classification and malware/content checks need completion.
- Payments: PayAngels is signed/re-verified; MoMo is now fail-closed/re-verified; provider deployment tests pending.
- AI: Edge Function boundary and guidance exist; complete allowlist, PII redaction, and prompt-injection proof pending.
- API: authenticated Edge Functions exist; comprehensive IDOR/rate/export tests pending.
- Mobile/desktop: client uses publishable credentials; release-signing and production-build evidence pending.
- DevOps/backups/monitoring: baseline scripts/CI exist; restore, alerting, secret scans, and RPO/RTO evidence pending.
- Incident/retention: documented in repository; operational enforcement and legal approval pending.

## Findings

| Issue | Severity | Location | Risk | Fix | Verification | Status |
|---|---|---|---|---|---|---|
| Unauthenticated MoMo callback mutation | CRITICAL | `supabase/functions/momo-webhook/index.ts` | Forged payment/payout state | HMAC secret plus provider re-verification | Unit/deployed forged callback test required | Remediated in code; deployment pending |
| KYC review fields writable by submitter | HIGH | `supabase/migrations/2026082701_security_remediation.sql` | Self-approval/identity integrity failure | Own insert/read only; trusted review trigger/policy | Apply migration and RLS test | Remediated in migration; deployment pending |
| Bank-feed access member-wide | HIGH | `supabase/functions/sync-bank-feed/index.ts` | Unauthorized financial-feed access | Finance-role checks in DB and function | Apply migration and role tests | Remediated in code/migration |
| Caller-controlled audit RPC | HIGH | `supabase/migrations/2026082701_security_remediation.sql` | Audit forgery | Revoke client execution; server-only writes | Apply migration and permission test | Remediated in migration; deployment pending |
| Credential-bearing local env files | HIGH | `.env`, `supabase/.env.local`, `supabase/.env.payments` | Credential compromise | Rotate and verify history | Operator evidence required | Open operational action |
| Rate limit failed open | MEDIUM | `supabase/functions/_shared/rate-limit.ts` | Abuse bypass during control failure | Fail closed with 503 | Function test/deployment test | Remediated in code |
| Public SVG/property media exposure | MEDIUM | storage migrations | Stored XSS/data exposure | Disallow SVG; make property media private by default | Apply migration and object-policy tests | Remediated in migration; classification pending |
| Missing comprehensive tenant/security tests | HIGH | Test suite | Unknown cross-tenant/IDOR risk | Add deployed RLS/API/Storage/AI tests | CI evidence required | Open |

## Remaining risks

The repository cannot prove deployed Supabase policy state, secret rotation/history cleanliness, provider callback contracts, backup restoration, monitoring coverage, legal sign-off, or penetration-test results. Do not claim production security completion until those gates have evidence.
