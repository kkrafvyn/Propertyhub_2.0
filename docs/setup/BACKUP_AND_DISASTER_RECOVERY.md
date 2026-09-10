# BaytMiftah Backup & Disaster Recovery

**Do this before any AWS migration or infrastructure change.**

> **Backup first → verify restore → migrate → validate → cut over.**  
> Never keep the only copy of production data on the same infrastructure as production.

---

## Three backup layers (Supabase stays primary)

| Layer | What | How |
|-------|------|-----|
| **1 — Immediate** | Full export while Supabase is live | `npm run backup` **or** Admin → Settings → **Run platform backup** |
| **2 — Offsite copy** | Separate storage from production DB | Private Supabase Storage bucket `platform-backups` (AWS S3 planned for future — **not required now**) |
| **3 — Restore proof** | Prove backups are usable | `npm run backup:restore-drill:verify` + integrity checks recorded on each admin backup |

> **Do not migrate to AWS yet.** Supabase remains the production database. AWS is part of the future plan only.

```text
                         BAYTMIFTAH DATA
                               │
                ┌──────────────┼──────────────┐
                │              │              │
             PRIMARY         DAILY          WEEKLY
           Supabase DB      DB Backup      Full Backup
                │              │              │
                └──────────────┼──────────────┘
                               │
                         AWS S3 Backup
                               │
                    ┌──────────┴──────────┐
                    │                     │
               Current copies        Older copies
                    │                     │
                    └──────────┬──────────┘
                               │
                       Restore Testing
                               │
                         Disaster Recovery
```

### What we back up

| Layer | Contents |
|-------|----------|
| **Database** | All `public` tables — users, orgs, properties, listings, leases, payments, CRM, messages, audit logs, AI config, platform config |
| **Storage** | `property-media`, `kyc-documents`, `documents`, `receipts`, `organization-assets`, `maintenance-media` |
| **Configuration** | Migration files, edge function sources, GitHub workflows, env **key** inventory (no secret values) |

Local backups: `backups/` (gitignored — may contain PII).  
Offsite copies: **encrypted AWS S3** in a dedicated bucket (not Supabase storage).

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run backup` | Local full backup (DB + storage + config) |
| `npm run backup:db` | Database only |
| `npm run backup:storage` | Storage buckets only |
| `npm run backup:list` | List local backups |
| `npm run backup:restore-drill` | Validate backup integrity (read-only) |
| `npm run backup:restore-drill:verify` | Drill + live DB counts + FK checks + evidence |
| `npm run backup:pre-migration:local` | **Pre-migration snapshot** locally + verify (no S3) |
| Admin → Settings → Run platform backup | **Layer 2** — database export to `platform-backups` storage |
| `npm run backup:pre-migration` | Pre-migration + optional future AWS S3 upload |
| `npm run backup:offsite` | Full pipeline: backup → drill → S3 → retention |
| `npm run backup:upload -- --path backups/... --tier daily` | Upload existing local backup |
| `npm run backup:retention:apply` | Apply S3 retention policy |

---

## Environment variables

```env
# Database (existing) — CI prefers SUPABASE_DB_URL (synced by ops:sync-github-secrets)
SUPABASE_DB_URL=postgresql://...
# or:
SUPABASE_DB_PASSWORD=...
SUPABASE_SERVICE_ROLE_KEY=...

# Offsite S3 (required for backup:pre-migration / backup:offsite)
BACKUP_S3_BUCKET=baytmiftah-backups-prod
BACKUP_S3_PREFIX=baytmiftah
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional:
# BACKUP_KMS_KEY_ID=arn:aws:kms:...
```

Add the same values as **GitHub repository secrets** for scheduled offsite backups.
The Offsite Backup workflow uses `SUPABASE_DB_URL` when present; without `BACKUP_S3_*` / `AWS_*` it skips cleanly instead of failing.

---

## Step 1 — Pre-migration backup (do now)

Before any AWS work:

```bash
# Without S3 configured yet:
npm run backup:pre-migration:local

# With S3 configured (recommended — copy off dev machine):
npm run backup:pre-migration
```

This exports DB + storage + configuration, runs restore drill, and (with S3) uploads an encrypted copy under tier `pre-migration` that is **never auto-deleted**.

---

## Step 2 — Automated offsite backups

GitHub Actions: `.github/workflows/backup-offsite.yml` (daily 03:00 UTC).

| Tier | Retention |
|------|-----------|
| `daily` | 30 days |
| `weekly` | 12 weeks |
| `monthly` | 12 months |
| `pre-migration` | Indefinite (manual delete only) |

S3 path: `s3://{bucket}/{prefix}/{projectRef}/{tier}/{backupId}/...`  
Encryption: AES256 (SSE-S3) or KMS when `BACKUP_KMS_KEY_ID` is set.

---

## Step 3 — Restore testing

```bash
npm run backup:restore-drill:verify
```

Validates: manifest ↔ JSON row counts, critical tables, optional live DB counts, FK orphan checks.  
Evidence: `scripts/backup/RESTORE_DRILL_EVIDENCE.json`

Full isolated restore (staging Postgres): apply `database/migrations/`, import `database/data/`, restore storage, redeploy edge functions, smoke test app.

---

## AWS migration procedure

```text
LIVE Supabase → backup:pre-migration → AWS staging → restore test
  → validate → AWS production → controlled cutover → users
```

Keep the pre-migration S3 snapshot untouched until migration is validated.

---

## Disaster recovery checklist

1. Download latest S3 backup (prefer `pre-migration` if recent migration)  
2. Provision fresh Postgres  
3. Apply migrations from `database/migrations/`  
4. Import data from `database/data/` or `database/sql/`  
5. Restore storage buckets  
6. Redeploy edge functions + Vercel env from secure vault  
7. Run `npm run backup:restore-drill:verify`  
8. Smoke test login, workspace, payments, admin  

---

## Security

- Never commit `backups/`  
- S3 bucket: block public access, encryption at rest  
- IAM: write/list/delete **only** on backup bucket  
- Never store secret values inside backup manifests  

---

## Source files

```text
scripts/backup/create-backup.mjs
scripts/backup/run-offsite-backup.mjs
scripts/backup/restore-drill.mjs
scripts/backup/apply-retention.mjs
scripts/backup/lib/s3-upload.mjs
scripts/backup/lib/critical-tables.mjs
.github/workflows/backup-offsite.yml
```
