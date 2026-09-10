# Pilot Readiness Checklist

Stage: **Controlled Pilot Readiness** (post code-freeze).

## Status tracker

| # | Workstream | Status | Evidence / command |
|---|------------|--------|-------------------|
| 1 | Fresh backup + restore drill | **Done (local)** | `npm run backup:pre-migration:local` → `scripts/backup/PRE_PILOT_RECOVERY_POINT.json` |
| 2 | PayAngels staging E2E | **Pass init + webhook (2026-09-10)** | `npm run pilot:payangels-e2e` — see `docs/pilot/PAYANGELS_E2E_EVIDENCE.md` |
| 3 | Resend + Vercel/Supabase secrets | **Partial** | Vercel synced (anon key manual); Supabase PayAngels secret needs dashboard verify |
| 4 | Security top-up | **In CI** | `storage-isolation.test.ts`, `platform-admin-live.test.ts`, `npm run security:unit` |
| 5 | Monitoring alerts | **Workflow added** | `.github/workflows/monitoring.yml` + `OPS_ALERT_WEBHOOK_URL` |
| 6 | Load test pilot flows | **Script ready** | `npm run load:pilot` |
| 7 | Pilot playbook + runbooks | **Done** | This folder |
| 8 | Legal counsel (P6) | **Human gate** | Counsel sign-off on live flows vs `src/content/legal/` |
| 9 | Onboard 1–3 orgs | **Ops** | `PILOT_ORG_PLAYBOOK.md` |

---

## Item 1 — Pre-pilot recovery point (completed 2026-09-06)

```bash
npm run backup:pre-migration:local
npm run backup:restore-drill:verify
```

- **Frozen backup:** `backups/2026-09-06T15-06-01-720Z_pre-migration_pre-migration`
- **Manifest:** `scripts/backup/PRE_PILOT_RECOVERY_POINT.json`
- **Evidence:** `scripts/backup/RESTORE_DRILL_EVIDENCE.json`

**Still open:** offsite S3 upload (`BACKUP_S3_*`), storage bucket backup (`SUPABASE_SERVICE_ROLE_KEY` in backup script).

---

## Item 2 — PayAngels staging E2E

```bash
npm run pilot:payangels-e2e -- --dry-run   # config check
npm run pilot:payangels-e2e               # full probe
```

Required: `PAYANGELS_SECRET_KEY`, `PAYANGELS_WEBHOOK_SECRET`, pilot user + listing IDs (see `.env.example`).

---

## Item 3 — Secrets

See `PILOT_SECRETS_CHECKLIST.md`.

---

## Item 6 — Load test

```bash
npm run load:pilot
npm run load:pilot -- --url https://app.baytmiftah.com --concurrency 10 --iterations 100
```

---

## Pilot go / no-go

**Go** when all are true:

- [ ] Pre-pilot backup frozen + offsite copy uploaded
- [x] PayAngels payment init + webhook E2E green (2026-09-10; refund/disbursement probes optional)
- [x] Public catalog has listed+public listings (`listedPublicCount: 1` — siabanku seed 2026-09-09)
- [ ] Resend domain verified + test email delivered
- [ ] Vercel prod env complete (incl. `VITE_SUPABASE_ANON_KEY`)
- [ ] CI green on `main`
- [ ] `npm run load:pilot` error rate ≤ 5%
- [ ] `OPS_ALERT_WEBHOOK_URL` tested with a forced failure
- [ ] Legal counsel waiver for pilot terms
- [ ] 1–3 pilot orgs contracted with success metrics
