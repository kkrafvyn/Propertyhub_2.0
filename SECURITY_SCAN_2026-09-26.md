# Security Scan — Verified Findings (2026-09-26)

Scope: full repository static review plus local scanner execution. Every finding
below cites the file and line that was actually read; nothing is inherited from
`SECURITY_AUDIT.md` / `VULNERABILITY_STATUS.md` without re-verification.

## Verification method

| Check | How | Result |
| --- | --- | --- |
| RLS coverage | Script over all migrations: diff every `CREATE TABLE` (any schema) vs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | 287 tables; **1 gap found and fixed** (F-16) |
| `anon` privilege surface | Regex sweep for `GRANT ... TO anon` across migrations | 14 grants, all `SELECT`-only or intentional |
| Secret leakage | `git log --all --name-only -- .env .env.local supabase/.env*` | Only `.env.*.example` ever committed |
| SAST | `node scripts/security/run-sast.mjs` | Ruleset gap found (F-5), scan now FAILS |
| SCA | `node scripts/security/run-sca.mjs` | PASS, 0 high+; 2 moderate dev-only via `npm audit` |
| Secrets / container scan | `run-secrets.mjs` | **UNVERIFIED** — Gitleaks + Trivy absent locally |
| Electron | Read `electron/main.cjs`, `electron/preload.cjs` | 3 findings (F-1..F-3) |
| CORS / rate limit | Read `_shared/cors.ts`, `_shared/rate-limit.ts` | F-4; rate limit correctly fails closed |
| Web headers | Read `vercel.json`, `docker/nginx.conf`, `Dockerfile` | F-6, F-7 |
| CI | Read all 10 workflows + `scripts/security/audit-workflows.mjs` | F-5, F-8, F-9 |

## Posture that verified clean

- **Row Level Security is near-complete.** All but one of the 287 tables created in
  `supabase/migrations/` have `ENABLE ROW LEVEL SECURITY`; the single exception
  (F-16) was assessed non-exploitable and closed during this pass. A regression test
  now enforces this across every table rather than the previous 24-table allowlist.
- **Rate limiting fails closed.** `supabase/functions/_shared/rate-limit.ts:16-19`
  throws `503` when `check_rate_limit` errors rather than allowing the request.
- **E-signature tokens are strong.** `ensure_esignature_signer_tokens` uses
  `encode(gen_random_bytes(16), 'hex')` (128-bit), routing order is enforced
  server-side, links are single-use
  (`2026090322_esignature_security_hardening.sql:24,107-118`), the public DTO
  leaks no signer tokens, and `sanitize_public_document_url` restricts
  `document_url` to `https:`.
- **No dangerous sinks.** No `eval`, `new Function`, or unguarded
  `dangerouslySetInnerHTML` in `src/`.
- **CI supply-chain basics.** No `pull_request_target`; every workflow declares
  scoped `permissions:`; no `${{ github.event.*.body }}` interpolated into shell.
- **`.env` hygiene.** Real secrets exist on disk but were never committed.

---

## Findings

### F-1 (HIGH) — Electron: `shell.openExternal` accepted any URL from the renderer

`ipcMain.handle("shell:openExternal", (_event, url) => shell.openExternal(url))`
passed renderer-supplied strings straight to the OS, and `desktopAPI.openExternal`
is exposed on every renderer page via `electron/preload.cjs:29`. Any XSS or
attacker-controlled string reaching that call could launch arbitrary OS protocol
handlers (`javascript:`, `file:`, or third-party custom schemes).

**Fixed.** `electron/main.cjs` now gates the handler through `isSafeExternalUrl()`,
allowlisting only `https:` and `mailto:`.

### F-2 (HIGH) — Electron: no navigation or window-open guards

`createWindow()` registered diagnostics but no `will-navigate` handler and no
`setWindowOpenHandler`. A renderer that navigated to remote content (a malicious
redirect from a listing URL, payment page, or support link) would load it with
full access to the `contextBridge` surface — including `offlineStore`, which
reads and writes the local SQLite outbox/drafts for every organization.

**Fixed.** `attachSecurityGuards()` denies foreign navigations, routes safe
`https:` links to the external browser, and denies `<webview>` attachment via
`will-attach-webview`. `sandbox: true` is now set explicitly (safe here:
`preload.cjs` requires only `contextBridge` and `ipcRenderer`).

### F-3 (HIGH) — Electron: OAuth deep link accepts unauthenticated tokens

`parseAuthCallback()` (`electron/main.cjs:53-85`) accepts
`baytmiftah://auth?...#access_token=...&refresh_token=...` and forwards it to the
renderer with **no `state`, `code_verifier`, or issuer binding** — a repo-wide
search for `code_verifier` / PKCE returned nothing. Because `extractDeepLink()`
also reads `second-instance` argv, any local process — or any web page triggering
the registered protocol — can inject a session and silently log the victim into
an attacker-controlled account.

**Not fixed — needs a product decision.** Recommended: delete the
`type: "session"` branch and support only the `type: "code"` (PKCE) path,
rejecting `access_token`/`refresh_token` in deep links.

### F-4 (MEDIUM) — Edge Function CORS trusts any `*.vercel.app`

`supabase/functions/_shared/cors.ts:9-16,27-35`:

- `isVercelAppOrigin()` returns true for **every** `*.vercel.app` hostname, so
  `https://attacker.vercel.app` receives a valid `Access-Control-Allow-Origin`.
- `isDevOrigin()` unconditionally allows `localhost`/`127.0.0.1` in production.
- `getAllowedOrigins()` line 60 **unions** env config with `DEFAULT_ALLOWED_ORIGINS`
  instead of replacing it, so `ALLOWED_ORIGINS` can only ever widen the policy,
  never tighten it.

Recommendation: restrict to the known project hostname
(`propertyhub-2-0-ecru.vercel.app`) or an explicit preview allowlist, and gate
`isDevOrigin` behind a non-production flag.

### F-5 (MEDIUM) — SAST rulesets omitted the security packs; CI inherited the gap

`scripts/security/run-sast.mjs` scanned only `p/typescript`, `p/react`,
`p/javascript` plus local rules, and added `--severity=ERROR`. Most rules in
Semgrep's security rulesets are `WARNING` severity, so injection/SSRF/crypto
classes were both unconfigured and — had they been configured — filtered out. The
prior "Semgrep: PASS" was therefore weak evidence. `.github/workflows/security.yml`
passed the same three packs, so CI shared the blind spot.

**Fixed.** Both now include `p/security-audit` and `p/owasp-top-ten`, and the filter
was widened from `--severity=ERROR` to `ERROR` + `WARNING` — the level at which most
security-audit rules report. `INFO` remains excluded on purpose: the repo's own
`baytmiftah-unsafe-window-open` and `baytmiftah-dangerous-innerhtml` rules are
`severity: INFO` with `disabled: true`
(`.semgrep/baytmiftah.yml:33-34,72-73`), and the severity filter is what actually
enforces that intent, since current Semgrep versions ignore the deprecated
`disabled` key. A first attempt that dropped the filter entirely re-enabled those two
intentionally-silenced rules and inflated the count to 37; the final ERROR+WARNING
filter keeps genuine security findings visible without overriding maintainer intent.

Note for CI: `semgrep/semgrep-action@v1` receives only the `config:` input, so it
does **not** apply the `ERROR`+`WARNING` filter that `run-sast.mjs` uses. The action
may therefore surface the two `INFO` rules `run-sast.mjs` suppresses. If that becomes
noise, either pass the severities through the action's `semgrep_args` input or switch
the job to invoke `npm run security:sast` so local and CI behaviour match exactly.

### F-6 (MEDIUM) — Docker/Nginx staging path served with zero security headers

`docker/nginx.conf` was 16 lines: no CSP, HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, or `Referrer-Policy`, and `server_tokens` was left on.
`vercel.json` has a strong set — so the container was the weakest deployment surface
for the same SPA bundle.

**Fixed**, with one subtlety worth recording: nginx's `add_header` directives do
**not** inherit into a location that declares any `add_header` of its own. A
first-pass patch that set `Cache-Control` inside `location = /sw.js`, `/assets/`, and
`/health` therefore silently stripped every security header from exactly those
responses. The final config resolves cache policy through a
`map $uri $app_cache_control` and declares the whole security set once at server
level, so no location needs its own `add_header` and all responses inherit.
An empty map value emits no `Cache-Control`, which keeps unhashed static assets
from being pinned `no-store`. `add_header Content-Type` on `/health` was also wrong
nginx usage and is now `default_type text/plain`.

Caveat: `nginx -t` could **not** be executed — the Docker daemon is not running here
(`docker info` fails on `dockerDesktopLinuxEngine`). Validate before deploying:
`docker run --rm -v "%cd%\docker\nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.27-alpine -t`.

### F-7 (MEDIUM) — CSP `script-src 'unsafe-inline'`

`vercel.json:29` allows `'unsafe-inline'` in `script-src`, which largely disables
the main XSS mitigation for an 854-file React SPA. `style-src` is a lower-stakes
version of the same, and `img-src https:` accepts any HTTPS host.
Recommendation: emit a per-deploy nonce or hash for the inline bootstrap in
`index.html`, then remove `'unsafe-inline'`.

### F-8 (MEDIUM) — Local security runners exit 0 when their tool is missing

`run-sast.mjs:37,54` and `run-secrets.mjs` call `process.exit(0)` on `UNVERIFIED`.
Locally, Gitleaks and Trivy are absent, so `npm run security:secrets` prints
`UNVERIFIED` and succeeds. CI does run `gitleaks/gitleaks-action@v2` and
`aquasecurity/trivy-action@v0.35.0`, so real coverage exists there — but a
developer running the local suite gets a green result from a scan that never ran.
Recommendation: add a `--strict` flag that turns `UNVERIFIED` into a non-zero exit
for CI, while keeping contributor-friendly behaviour locally.

### F-9 (LOW) — `audit-workflows.mjs` unpinned-actions check is a dead stub

`scripts/security/audit-workflows.mjs:34-36` matches `uses:` without a pin and then
executes an empty block. Every workflow floats on mutable tags
(`actions/checkout@v4`, `semgrep/semgrep-action@v1`, `gitleaks-action@v2`,
`actions/download-artifact@v4`), so a force-moved or compromised upstream tag runs
third-party actions to `@sha256:` digests, enable Dependabot for `github-actions`,
and either implement or delete the stub.

### F-10 (LOW) — 12 tables have RLS enabled but zero policies

`fraud_reports`, `image_hashes`, `listing_sync_jobs`, `nearby_services`,
`property_inspections`, `rate_limit_buckets`, `recommendation_logs`,
`reconciliation_adjustments`, `vendor_assignments`, `vendor_ratings`,
`vendor_services`, `vendors`.

RLS-with-no-policy is deny-all, so this is **not** a data exposure — it is a latent
functional bug (`vendors`/`vendor_services` are user-facing) if any code path reads
them as `anon`/`authenticated` instead of `service_role`. Each needs an explicit
"intentional" annotation or a policy.

`private.account_guard_config` would also appear in this set, but after F-16 its
deny-all state is deliberate rather than accidental.

Two accuracy notes on how this list was produced: an earlier draft reported 11 and
omitted `listing_sync_jobs`, which the widened scan caught. The matching is still
regex-based over migration text (`CREATE POLICY ... ON <table>` within a bounded
window), and it does not model `ALTER POLICY`, policies created inside `DO $$`
blocks, or the two `DO $$ ... FOR r IN ... CREATE POLICY ... %I ...$$` loops in
`2026092304_scoped_administration.sql`, which apply policies to tables
programmatically. Treat this list as "needs human confirmation against
`pg_policies`", not as a verified count — which is exactly what upgrade
opportunity 2 is for.

### F-11 (LOW) — `resetAndApplySchema.mjs` grants `ALL` to `public`/`anon`

Lines 67-75 run `GRANT ALL ON SCHEMA public TO public`,
`GRANT ALL ON ALL TABLES ... TO anon`, and set matching `ALTER DEFAULT PRIVILEGES`.
Combined with RLS this is survivable, but it collapses the privilege layer onto RLS
alone. The script gates on `--confirm` (line 116) but has **no check that the target
project is not production** — it derives the project ref from `VITE_SUPABASE_URL`
with no allowlist. Add a hard refusal for non-local refs.

### F-12 (LOW) — `.npmrc` sets only `legacy-peer-deps=true`

No `audit=true` / `audit-level=high`, and `--legacy-peer-deps` is repeated in the
`Dockerfile` build, which suppresses peer-dependency conflicts that can mask
incompatible security fixes. `npm audit` currently reports 2 moderate
(`@vitest/mocker` path traversal, GHSA-82fw-gwwq-j7x9), dev-only, fixed by vitest v5.

### F-13 (MEDIUM) — Ops scripts disable TLS certificate verification

Newly visible after the F-5 ruleset fix:
`problem-based-packs.insecure-transport.js-node.bypass-tls-verification` fires 11
times, every one of them `ssl: { rejectUnauthorized: false }` on a live `pg`
connection — `scripts/ops/check-tables.mjs:12`, `scripts/supabase-db.mjs:60`,
`scripts/resetAndApplySchema.mjs:60`, plus `scripts/backup/lib/db-config.mjs`,
`scripts/ops/probe-dashboard{,-rls}.mjs`, `scripts/security/grant-platform-admin.mjs`,
`scripts/security/provision-tenant-isolation-fixtures.mjs`, and the three
`scripts/workers/*` jobs. Connections to real Supabase hosts are therefore
MITM-able, and several of these scripts run with `service_role`/platform-admin
credentials. Recommendation: default to verification and allow opt-out only via an
explicit env flag scoped to local databases.

### F-14 (INFO) — `detect-child-process` true positives in the tooling itself

`javascript.lang.security.detect-child-process` fires 3 times in
`scripts/security/check-security-tools.mjs` and `scripts/security/lib/resolve-tool.mjs`.
These legitimately spawn `semgrep`/`gitleaks`/`trivy`, so they are intended
behaviour, not a defect — they need `# nosemgrep` annotations with a reason so the
signal stays useful.

### F-15 — Net effect of the ruleset fix

With the final `ERROR` + `WARNING` filter the scan reports **14 findings**:
11 × `bypass-tls-verification` (F-13) and 3 × `detect-child-process` (F-14). All 14
are in `scripts/` — **`src/` and `supabase/functions/` are clean**. Dropping the
filter entirely first produced 37, the extra 23 being the two `INFO` rules the repo
disabled on purpose, which confirmed the filter's value.

The scan now exits non-zero, so **CI will fail on this change until the 14 are
baselined**. Recommended sequencing: annotate the 3 `child-process` sites with
`# nosemgrep`, fix F-13, and only then land the ruleset change — or land F-13 first.
A longer-term option is splitting the SAST job so `scripts` reports without gating
while `src` + `supabase/functions` gate strictly.

### F-16 (LOW) — `private.account_guard_config` had RLS disabled — FIXED

This is the correction to an earlier draft of this report, which claimed "272 tables,
0 missing RLS". That scan used a looser regex that only matched unqualified
`CREATE TABLE` statements in `public`. Widening it to every schema and to
`CREATE TABLE IF NOT EXISTS` found **287** tables, one of which never had RLS
enabled: `private.account_guard_config`
(`2026092303_account_access_enforcement.sql:15`), which stores the preserved
PostgREST pre-request hook as a `REGPROCEDURE`.

It is **not exploitable today**, for three independent reasons:

1. `private` is not an exposed PostgREST schema, so there is no REST/RPC path.
2. No table-level `SELECT` is granted to `anon`/`authenticated`. `GRANT USAGE ON
   SCHEMA private` (`2026090704`, `2026090801`) permits referencing objects in the
   schema but does not grant table privileges.
3. Its only reader, `public.enforce_account_access()`, is `SECURITY DEFINER` with
   `SET search_path = ''`, so it reads as the owner and bypasses RLS regardless.

The risk is that those three facts are load-bearing and unstated: a future blanket
grant of the `GRANT ALL ON ALL TABLES IN SCHEMA private TO anon` shape used in F-11
would expose the table instantly. Enabling RLS is free because the `SECURITY DEFINER`
owner still reads it, so the hardening cannot break the hook.

**Fixed** by `supabase/migrations/2026092601_account_guard_config_rls.sql`
(`ALTER TABLE private.account_guard_config ENABLE ROW LEVEL SECURITY`). With no
policies, access is denied to every non-owner role. Run `supabase db push` to apply.

---

## Recommended order of work

1. **F-3** — make deep-link auth PKCE-only. Highest severity remaining.
2. **F-13** — remove `rejectUnauthorized: false`, gated by a local-only env flag.
3. **F-4** — tighten CORS to the exact project hostname.
4. **F-15** — triage the 37 findings into a Semgrep baseline/`nosemgrep` so CI can
   go red on regressions without blocking every merge on day one.
5. **F-7** — nonce-based CSP.
6. **F-9** — pin actions to SHA + Dependabot for actions.
7. **F-10/F-11/F-12** — low-severity cleanups.

## Upgrade opportunities

1. **Coverage gate for RLS in CI — now implemented.** `rls-policy-audit.test.ts`
   previously asserted RLS only for a **hardcoded allowlist of 24 sensitive tables**,
   so any 25th table added without RLS passed CI silently. It now additionally scans
   every `CREATE TABLE` across all migrations and schemas and fails on any table that
   never enables RLS, with an explicit `RLS_EXEMPT_TABLES` set (empty today) for
   deliberate exceptions such as declaratively-partitioned children and
   extension-owned tables. This is what caught F-16, and it runs inside the existing
   `npm run security:unit` CI job. The honest caveat: it is still a *static* check of
   migration text, so a table created outside migrations, or an `ALTER TABLE ...
   DISABLE ROW LEVEL SECURITY` applied in the dashboard, would not be seen.
2. **Verify against the live database, not just migrations.** Every RLS conclusion
   here is static. A drift check plus a query against `pg_policies` would confirm the
   deployed state matches the repo.
3. **Split the SAST target sets.** App code (`src`, `supabase/functions`) should gate
   CI strictly; `scripts` is dev tooling with different risk and is generating most
   of the noise. Two jobs with separate severities keeps the signal actionable.
4. **Record the Electron guard tests.** F-1/F-2 fixes are currently unverified by
   automation; a small unit test over `isSafeExternalUrl`/`isTrustedAppUrl` would
   lock the behaviour in.

## Files changed in this pass

- `electron/main.cjs` — scheme allowlist for `openExternal`;
  `will-navigate` / `setWindowOpenHandler` / `will-attach-webview` guards; explicit
  `sandbox: true`.
- `docker/nginx.conf` — full security header set declared once at server level,
  `map`-driven `Cache-Control` (so no location strips inherited headers),
  `server_tokens off`, dotfile/source-map denial. **Not yet validated with
  `nginx -t`** — Docker daemon unavailable.
- `scripts/security/run-sast.mjs` — added `p/security-audit` + `p/owasp-top-ten`;
  removed `--severity=ERROR`.
- `.github/workflows/security.yml` — same ruleset additions in CI.
- `src/lib/security/rls-policy-audit.test.ts` — added a dynamic all-tables RLS
  coverage gate alongside the existing 24-table allowlist check (27 → 29 tests).
- `supabase/migrations/2026092601_account_guard_config_rls.sql` — new; enables RLS on
  the one table that lacked it (F-16). **Requires `supabase db push`.**
- `SECURITY_SCAN_2026-09-26.md` — this report.



