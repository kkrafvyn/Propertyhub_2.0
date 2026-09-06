# AWS Migration Prep (Vercel + Supabase today)

BaytMiftah runs on **Vercel (web)** + **Supabase (DB, auth, storage, Edge Functions)** today. This document prepares a future move to AWS without blocking current delivery.

## Current → target

```text
Today                          Future (when scale requires)
─────────────────────────────────────────────────────────────
Vercel (static + SSR)    →     CloudFront + S3 / ECS Fargate
Supabase Postgres        →     Aurora PostgreSQL
Supabase Storage         →     S3
Supabase Edge Functions  →     API Gateway + Lambda / Fargate
GitHub Actions CI        →     Same + AWS CodePipeline (optional)
pg_cron / workers        →     SQS + ECS workers
```

## Prep work (do now on Vercel)

1. **Docker-ready backend** — `Dockerfile` and `docker compose` already exist; keep Edge Function logic portable.
2. **Env separation** — all secrets in `.env` / Supabase secrets; no hardcoded URLs.
3. **Offsite backups** — configure `BACKUP_S3_*` (see [API_KEYS_AND_INTEGRATIONS.md](./API_KEYS_AND_INTEGRATIONS.md)).
4. **Correlation IDs** — pass `organization_id` and user context in logs (expand in observability phase).
5. **Queue abstraction** — workers in `scripts/workers/`; later swap runner to SQS consumer without changing job handlers.
6. **Rate limiting** — `check_rate_limit` RPC + Edge `_shared/rate-limit.ts`; portable to API Gateway usage plans.

## AWS services map

| Concern | AWS service |
|---|---|
| CDN + static web | CloudFront + S3 |
| API / workers | ECS Fargate or Lambda |
| Database | Aurora PostgreSQL |
| Object storage | S3 |
| Queues | SQS |
| Secrets | Secrets Manager |
| WAF | AWS WAF in front of CloudFront |
| Monitoring | CloudWatch + X-Ray |
| Email | SES (or keep Resend) |

## Migration sequence (when ready)

1. **Staging** — Aurora + S3 + Fargate staging; mirror Supabase data.
2. **Read replica / dual-write** — validate tenant isolation and RLS equivalents in app layer.
3. **Cutover** — DNS to CloudFront; freeze Supabase writes; final sync.
4. **Decommission** — retire Supabase after DR validation.

## RPO / RTO targets (recommended)

| Metric | Target |
|---|---|
| RPO (max data loss) | 24 hours (daily backup) / 1 hour with continuous archiving |
| RTO (time to restore) | 4 hours staging / 8 hours production |

Runbook: [BACKUP_AND_DISASTER_RECOVERY.md](./setup/BACKUP_AND_DISASTER_RECOVERY.md)

## Do not migrate yet if

- Traffic is comfortably served by Vercel + Supabase
- Team has not load-tested or formalized observability
- Smile KYC, payments, and entitlements are not production-stable

Stay on Vercel until **queues, monitoring, and DR are boring**.
