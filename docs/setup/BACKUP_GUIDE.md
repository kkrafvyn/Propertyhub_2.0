# Data Backup Guide

BaytMiftah stores data in **Supabase PostgreSQL** (database) and **Supabase Storage** (files). This guide covers automated local backups and Supabase's built-in cloud backups.

---

## Quick start

### 1. Ensure database credentials are in `.env`

```env
SUPABASE_DB_PASSWORD=your-db-password
# or
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

### 2. (Recommended) Add service role key for storage backup

Supabase Dashboard → **Settings** → **API** → `service_role` key:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Never commit this key or expose it in the client app.

### 3. Run a backup

```bash
npm run backup
```

Backups are saved to `backups/<timestamp>_full/` (gitignored).

| Command | What it does |
|---|---|
| `npm run backup` | Database + storage |
| `npm run backup:db` | Database only |
| `npm run backup:storage` | Storage only |
| `npm run backup:list` | List existing backups |

---

## What gets backed up

### Database (`backups/.../database/`)

| File | Contents |
|---|---|
| `data/*.json` | Every public table as JSON |
| `sql/*.sql` | INSERT statements per table |
| `migrations/` | Copy of `supabase/migrations/` (schema source) |
| `manifest.json` | Table row counts + applied migrations |

### Storage (`backups/.../storage/`)

| Bucket | Contents |
|---|---|
| `property-media` | Listing photos |
| `receipts` | Payment receipts (private) |
| `documents` | Leases, agreements (private) |
| `organization-assets` | Agency logos and branding |

### Root manifest

`backup-manifest.json` — summary with timestamp and project ref.

---

## Supabase cloud backups (recommended for production)

Supabase Pro plans include **daily automated backups** with point-in-time recovery.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Settings** → **Database** → **Backups**
3. Enable daily backups (Pro plan required)
4. For disaster recovery, also download a manual backup weekly:

```bash
npm run backup
```

Copy the `backups/` folder to external storage (Google Drive, S3, external drive).

---

## Restore

### Restore database from JSON/SQL backup

1. Apply schema from migrations (if fresh database):

```bash
npm run db:push
```

2. Import table data — use SQL files in `database/sql/` via Supabase SQL Editor or `psql`:

```bash
# If you have PostgreSQL client installed:
psql "$SUPABASE_DB_URL" -f backups/<timestamp>/database/sql/users.sql
```

Or restore selectively from JSON using a custom import script.

### Restore storage files

Re-upload files from `backups/<timestamp>/storage/<bucket>/` via:

- Supabase Dashboard → Storage → Upload
- Or Supabase Storage API with service role key

---

## Automated schedule (Windows Task Scheduler)

Create a weekly task:

1. Open **Task Scheduler** → Create Basic Task
2. Trigger: Weekly (e.g. Sunday 2:00 AM)
3. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd /d "E:\New folder\Propertyhub_2.0" && npm run backup`
4. Copy `backups/` to cloud storage after each run

### PowerShell one-liner (manual)

```powershell
cd "E:\New folder\Propertyhub_2.0"
npm run backup
```

---

## Alternative: Supabase CLI dump (requires Docker)

If Docker Desktop is installed:

```bash
$dbUrl = node scripts/build-db-url.mjs
npx supabase db dump --db-url $dbUrl -f backups/schema.sql
npx supabase db dump --db-url $dbUrl --data-only -f backups/data.sql
```

---

## Security

- `backups/` is **gitignored** — never commit backup folders
- Backups contain **real user data** — encrypt at rest if stored in cloud
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if exposed
- Store backups in a separate location from production credentials

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Missing SUPABASE_DB_PASSWORD` | Add DB password to root `.env` |
| Storage backup skipped | Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` |
| Connection timeout | Check Supabase project is not paused; verify region in `.env` |
| Empty tables | Normal for new projects; backup still captures schema |

---

*Last updated: July 2026*
