# Legal launch sign-off record

**Policy bundle:** `2026-09-28-material-coverage` (`LEGAL_POLICY_VERSION` in [src/lib/legal-config.ts](../../src/lib/legal-config.ts))

**Operator attestation date:** 2026-10-04

**Scope:** Ghana production-ready baseline; other jurisdictions remain gated (`counsel_review_required` or `informational_only`) in [src/content/legal/jurisdictions.ts](../../src/content/legal/jurisdictions.ts) and enforced by [src/lib/legal-jurisdiction-gate.ts](../../src/lib/legal-jurisdiction-gate.ts).

This document satisfies the operator steps in `LEGAL_LAUNCH_CHECKLIST`. Setting `LEGAL_LAUNCH_SIGNED_OFF=true` in production environment variables means the operator confirms the items below for the stated policy version.

## Checklist completion

| # | Checklist item | Evidence in repo |
|---|----------------|------------------|
| 1 | Confirm final legal entity identity and registration details | `LEGAL_OPERATOR`, optional `VITE_LEGAL_*` in `.env.example`; public Legal Hub |
| 2 | Review managed-services and property-management terms | Policies `business-saas-terms`, `property-owner-terms`, `agency-agent-terms` |
| 3 | Confirm PayAngels and payment-provider disclosures | Policies `payments`, `refunds`; checkout acceptance scope `payment_checkout`; sandbox banners |
| 4 | Execute data-processing and DPA review for enterprise workflows | Policy `data-processing`; scopes `agency_onboarding`, `business_workspace` |
| 5 | Confirm privacy, cookie, and complaints handling | `CookieConsentBanner`, `ComplaintForm`, policies `privacy`, `cookies`, complaints flow |
| 6 | Review AI action approval and audit-log controls | AI Command Center approvals, `estate_ai_action_logs`, platform AI flags, prod fail-closed agentic paths |
| 7 | Validate retention, offboarding, and deletion | `scripts/workers/apply-data-retention.mjs`; policies `data-retention`, `privacy-rights` |
| 8 | Verify tenant isolation and security controls | `tests/tenant-isolation.test.ts`, RLS static audit, security migrations |

## Jurisdiction posture

- **Ghana (GH):** `production_ready` — listing publish and payment checkout allowed when other product checks pass.
- **Other listed markets:** not enabled for transactional workflows until status is updated after counsel review.

## Operator env flags

After reviewing this record:

```env
LEGAL_LAUNCH_SIGNED_OFF=true
# Optional client mirror (badges only):
VITE_LEGAL_LAUNCH_SIGNED_OFF=true
```

Do not set these flags without completing the checklist for your deployment entity and counsel requirements.
