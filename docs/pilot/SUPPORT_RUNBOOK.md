# Support Runbook (Pilot)

## External (users)

**Channel:** In-app **Support** (admin console routes tickets) + email `support@baytmiftah.com`

Future: `support.baytmiftah.com` → help center (not a pilot blocker).

### Categories

| Category | Examples | Priority default |
|----------|----------|------------------|
| Payment problem | Failed charge, refund status | P1 |
| Account problem | Login, KYC, invitation | P2 |
| Property problem | Listing, booking, lease data | P2 |
| Technical issue | Bug, slow page, error message | P2 |
| General help | How-to | P3 |

## Internal triage

```text
Ticket received
  → Assign owner
  → Set priority (P1–P4)
  → SLA clock starts
  → Investigate (reproduce in staging if possible)
  → Resolve or escalate
  → Close with summary to user
```

### SLA (pilot)

| Priority | First response | Resolution target |
|----------|----------------|-------------------|
| P1 | 1 hour | 4 hours |
| P2 | 4 hours | 1 business day |
| P3 | 1 business day | 3 business days |

## Common resolutions

### Login / OAuth

- Confirm redirect URLs include `https://app.baytmiftah.com/**` in Supabase Auth
- Check user exists in `organization_members` if workspace access expected

### KYC stuck

- Check `kyc_submissions` status
- Smile keys optional — falls back to AI pre-screen + manual review
- Platform admin: Trust console

### Payment failed

- Verify PayAngels keys + webhook secret
- Check `property_transactions` for reference
- Run `npm run pilot:payangels-e2e -- --dry-run` for config sanity

### Desktop download blocked

- Check plan entitlements (`entitlements.service`)
- Personal plan: web/mobile only by design

## Escalation to incident

If multiple orgs affected or data/payment integrity at risk → `INCIDENT_RUNBOOK.md` (SEV-1/2).

## Metrics to track

- Tickets opened / closed per week
- Mean time to first response
- Mean time to resolution
- Repeat issues (top 5 categories)
