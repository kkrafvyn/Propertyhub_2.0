# Pilot Organization Playbook

## Target scale

- **1–3 business organizations**
- **Controlled consumer users** (invited, not open signup flood)
- **30–60 day** pilot window

## Recommended pilot mix

| Slot | Profile | Validates |
|------|---------|-----------|
| Pilot 1 | Property management company (20+ units) | Estate ops, collections, maintenance |
| Pilot 2 | Real-estate agency | Listings, deal cases, messaging |
| Pilot 3 | Individual / small portfolio owner | Personal workspace, desktop eligibility |

## Onboarding sequence (per org)

```text
1. Contract + pilot success metrics signed
2. Create organization (or approve enrollment request)
3. Apply template pack manually (see workspace-template-packs.ts)
4. Set entitlements / plan in saas_organization_entitlements
5. Invite users with correct workspace roles
6. KYC gate: verify org owner KYC if required by platform_kyc_policies
7. Configure PayAngels connection for org (if accepting payments)
8. Walkthrough: first listing → first tenant → first payment
9. Add to pilot metrics spreadsheet (weekly review)
```

## Manual configuration (no new features)

For pilot orgs, configure in admin / SQL rather than building customization UI:

- **Modules:** enable slugs in `organization_settings` / entitlements
- **Navigation:** `workspace-role-nav` + org profile type
- **Branding:** `organization_branding` row
- **Notifications:** org notification preferences
- **Approval chains:** `organization_approval_chains` if finance workflows needed

## Success metrics (track weekly)

| Metric | Target (example) |
|--------|------------------|
| Activation | All invited users logged in within 7 days |
| Time to first listing | < 48 hours from onboarding call |
| Time to first tenant/lease | < 14 days |
| Time to first payment | < 30 days (if payments in scope) |
| Maintenance resolution (median) | Baseline TBD week 2 |
| Weekly active users | ≥ 60% of invited seats |
| Payment success rate | ≥ 95% |
| Critical errors | 0 unresolved > 24h |
| Support tickets | All P1 within 4h |

## Weekly pilot review agenda

1. Metrics vs targets
2. Top 3 user-reported issues
3. Payment / webhook health (`npm run ops:health`)
4. Backup status
5. Go/no-go for expanding scope

## Conversion to commercial

At pilot end:

- Review metrics with org sponsor
- Propose standard pricing (`PILOT_OFFER_STRUCTURE.md`)
- Export data if they churn; retain audit trail if they convert

## Support path

Users report via in-app support → admin console. Escalation: `SUPPORT_RUNBOOK.md`.

## Desktop

Business users on eligible plans: `/workspace/desktop` download prompt. Not required for pilot success.
