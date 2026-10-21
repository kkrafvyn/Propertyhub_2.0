# Release runbook

Three channels, three actions. **One git push does not update native apps.**

## 1. Web — push `main` (Vercel)

```bash
git push origin main
```

With the repo connected to Vercel, production deploys from `main` automatically (`npm run build:vercel` → `dist/`).

- Confirm deploy in the [Vercel dashboard](https://vercel.com/dashboard).
- Browser users get the new UI after refresh; installed PWAs pick up updates via the service worker (`src/lib/pwa.ts`).

**No GitHub “Deploy” workflow is required for the web front end.**

## 2. Mobile stores — bump version, upload builds

Native apps ship a **bundled** web build. After web changes you care about on phones:

1. Choose a semver (e.g. `1.0.1`).
2. Run **Actions → Release** (or upload stores individually):
   - Set **version** to your semver.
   - **play:** `both`, `consumer`, or `workspace`.
   - **apple:** `both`, `ios`, or `macos` when Apple secrets are configured.

Or run child workflows directly:

- **Google Play Upload** — [GOOGLE_PLAY_UPLOAD.md](./GOOGLE_PLAY_UPLOAD.md)
- **Apple Store Upload** — [APPLE_STORE_UPLOAD.md](./APPLE_STORE_UPLOAD.md)

Users update when the store installs the new build (Play/App Store auto-update or manual update).

## 3. Backend — Supabase when schema or functions change

When you add migrations or change edge functions:

1. Merge to `main`.
2. Run **Actions → Release** with **deploy_supabase** enabled, **or** **Actions → Deploy** alone.
3. Use **skip_db: true** if you only deploy functions and migrations were applied elsewhere.

Requires GitHub secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

## One-shot orchestration

**Actions → Release → Run workflow**

| Input | Typical use |
|-------|-------------|
| `version` | Store `versionName` / marketing version |
| `deploy_supabase` | After backend changes |
| `skip_db` | Functions-only deploy |
| `play` / `apple` | Upload mobile/desktop store packages |
| `play_track` | Start with `internal`, then promote in Play Console |

The **production-gate** job runs the same checks as Deploy (build, typecheck, tests, SQL upgrades, backup fixture).

## Order of operations (recommended)

```text
1. Merge feature branch → main          (web deploys on Vercel)
2. If DB/functions changed → Release with deploy_supabase
3. If native UI/behavior changed → Release with play and/or apple + new version
4. Verify: web URL, Play internal track, TestFlight / App Store Connect processing
```

## Local pre-flight

```bash
npm run production:check
npm run mobile:release          # native config sanity
npm run security:all            # before major releases
```
