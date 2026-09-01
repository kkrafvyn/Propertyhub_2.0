# BaytMiftah Disaster Recovery

## Targets

Initial targets pending business approval: RPO <= 24 hours for ordinary data and <= 1 hour for financial/provider event data; RTO <= 8 hours for core application services and <= 24 hours for full restoration.

## Recovery order

1. Secure credentials and establish an isolated recovery environment.
2. Restore Supabase/Postgres schema and data from an encrypted backup.
3. Restore Storage objects and verify object ownership/policies.
4. Deploy the web app and Edge Functions from a known CI artifact.
5. Reconcile provider webhooks and idempotent financial events.
6. Verify Auth, RLS, tenant isolation, payment state, notifications, and audit logging.
7. Communicate service restoration and record evidence.

## Backup controls

Backups must be encrypted, access-restricted, separated from ordinary application credentials, retained according to `DATA_RETENTION_POLICY.md`, and monitored for success/failure.

## Current gap

Backup scripts and guidance exist, but a successful isolated restore, measured RPO/RTO, offsite replication, and recovery evidence are not yet present in the repository.
