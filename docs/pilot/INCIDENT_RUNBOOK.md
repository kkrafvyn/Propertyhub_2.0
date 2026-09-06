# Incident Response Runbook

Use this when production is impaired. Do not invent process during an outage.

## Severity

| Level | Definition | Response time |
|-------|------------|---------------|
| **SEV-1** | Platform down, payments broken, data breach suspected | Immediate |
| **SEV-2** | Major feature broken for multiple orgs | < 1 hour |
| **SEV-3** | Single-org issue, workaround exists | < 4 hours |
| **SEV-4** | Minor defect, cosmetic | Next business day |

## Roles

- **Incident commander:** On-call engineer (you)
- **Comms:** Notify pilot org contacts for SEV-1/2
- **Scribe:** Log timeline in support ticket

## Detect

Sources:

- `OPS_ALERT_WEBHOOK_URL` (monitoring workflow)
- User reports via support
- `npm run ops:health` manual check
- Vercel / Supabase dashboards

## Incident types

### OUTAGE (app unreachable)

1. Check [Vercel status](https://www.vercel-status.com/) and [Supabase status](https://status.supabase.com/)
2. Verify latest deploy: `gh run list --workflow=CI`
3. Rollback Vercel deployment if bad deploy suspected
4. Communicate ETA to pilot orgs if > 15 min

### DATABASE INCIDENT

1. Stop destructive migrations
2. Check Supabase logs → Database
3. Restore from pre-pilot point: `docs/setup/BACKUP_AND_DISASTER_RECOVERY.md`
4. Reference: `scripts/backup/PRE_PILOT_RECOVERY_POINT.json`

### PAYMENT INCIDENT

1. Check PayAngels dashboard + webhook delivery logs
2. Inspect `property_transactions`, `webhook_events` in Supabase
3. Do **not** manually credit wallets without finance approval
4. Replay webhook only with verified HMAC payload
5. See `WEBHOOK_SECURITY.md`

### SECURITY INCIDENT

1. Rotate compromised keys immediately (Supabase, PayAngels, Resend)
2. Revoke affected user sessions (Supabase Auth)
3. Preserve audit logs — do not delete evidence
4. Notify counsel if PII exposure suspected

### DATA LOSS

1. Identify scope (table, org, time range)
2. Restore from latest backup to isolated environment first
3. Selective merge — never overwrite prod without drill

## Contain → Investigate → Recover → Postmortem

```text
Detect
  → Assign severity + commander
  → Contain (rollback, disable feature flag, block IP)
  → Investigate (logs, health check, recent deploys)
  → Recover (fix forward or restore)
  → Communicate all-clear
  → Postmortem within 48h (blameless, action items)
```

## Postmortem template

- **Timeline** (UTC)
- **Impact** (users, transactions, duration)
- **Root cause**
- **What went well**
- **Action items** (owner + date)

## Contacts

- Supabase support: dashboard → Support
- PayAngels: merchant support channel
- Vercel: team dashboard
- Pilot org sponsors: maintain in private ops doc (not in git)
