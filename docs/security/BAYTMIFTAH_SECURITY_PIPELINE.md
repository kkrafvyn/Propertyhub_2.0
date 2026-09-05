# BaytMiftah DevSecOps Security Pipeline

Production-grade security automation for the BaytMiftah repository. This pipeline **extends** the existing `ci.yml` workflow — it does not replace build, typecheck, unit tests, E2E, legal checks, backup drills, or live tenant-isolation tests already running in CI.

## Architecture

```text
                         PUSH / PR
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       Existing CI (ci.yml)        Security (security.yml)
       build · test · E2E          SAST · SCA · secrets · unit
       tenant isolation live       actions audit · summary
              │                           │
              └─────────────┬─────────────┘
                            ▼
                    CodeQL (codeql.yml)
                            │
                            ▼
              DAST staging only (security-dast.yml)
                            │
                            ▼
                     SECURITY GATE
```

## Workflows

| Workflow | File | Triggers |
|----------|------|----------|
| CI (unchanged) | `.github/workflows/ci.yml` | push, pull_request |
| Security | `.github/workflows/security.yml` | push, pull_request, weekly schedule, manual |
| CodeQL | `.github/workflows/codeql.yml` | push, pull_request, weekly schedule, manual |
| DAST | `.github/workflows/security-dast.yml` | push to main, weekly schedule, manual; PR records UNVERIFIED |

## Tools

| Layer | Tool | Purpose |
|-------|------|---------|
| SAST | Semgrep + CodeQL | Static analysis for XSS, injection, unsafe patterns, BaytMiftah custom rules |
| SCA | npm audit + Dependency Review | Known vulnerable dependencies |
| Secrets | Gitleaks | Detect committed credentials |
| Actions audit | `audit-workflows.mjs` | Dangerous workflow patterns |
| Tenant isolation | Existing Vitest suite + CI fixtures | Live RLS / cross-tenant denial |
| API authorization | Vitest static tests | Platform admin separation, grant model |
| DAST | OWASP ZAP baseline | Staging-only dynamic scan |
| Container / FS | Trivy filesystem | Trivy | `security.yml` → `security-container` | push, PR, weekly | none | 0 CRITICAL unfixed | P0 Critical | Engineering |

## Severity policy

| Severity | Policy |
|----------|--------|
| P0 / Critical | **BLOCK** deployment |
| P1 / High | **BLOCK** |
| P2 / Medium | Warn / track |
| P3 / Low | Track |
| Unknown / skipped | **UNVERIFIED** |

### Security gate states

- **GREEN** — required checks passed
- **YELLOW** — passed with unverified/delegated items (e.g. DAST on PR, local-only Semgrep)
- **RED** — blocker (SAST/SCA/secrets/tenant isolation failure)

Skipped tenant-isolation tests are **never** treated as PASS.

## Tenant isolation methodology

Live proof uses dedicated CI fixtures (two organizations, two users):

```bash
npm run security:tenant-fixtures
RUN_TENANT_ISOLATION_TESTS=true npm run security:tenant
```

Required secrets (4):

- `VITE_SUPABASE_TEST_URL`
- `VITE_SUPABASE_TEST_ANON_KEY`
- `VITE_SUPABASE_TEST_TENANT_A_ID`
- `VITE_SUPABASE_TEST_TENANT_B_ID`

Tokens are minted at test time via fixture sign-in (`TENANT_FIXTURE_PASSWORD` optional override).

**On push/PR:** live tenant tests run in `ci.yml` (`build-and-test`). The security workflow records this as **DELEGATED**.

**On schedule/manual:** `security.yml` also runs `npm run security:tenant`.

Tests cover bank feeds, payments, journals, AI controls, properties, listings, organizations, storage, visitor passes.

## DAST methodology

- Target: **`DAST_TARGET_URL`** in GitHub **Environment: `staging`**
- Production URLs are **blocked** by `scripts/security/validate-dast-target.mjs`
- Blocked patterns include `baytmiftah.com`, `propertyhub-2-0*.vercel.app`
- Allowed hints: `staging`, `preview`, `localhost`, `test`, `-dev`

Authenticated DAST uses synthetic staging credentials in the **`staging`** GitHub Environment:

- `DAST_TEST_EMAIL`
- `DAST_TEST_PASSWORD`
- `DAST_SUPABASE_URL` (or falls back to `VITE_SUPABASE_TEST_URL`)
- `DAST_SUPABASE_ANON_KEY` (or falls back to `VITE_SUPABASE_TEST_ANON_KEY`)

The workflow signs in via Supabase, injects a masked `Authorization` header into ZAP, and runs a second baseline pass. If credentials are missing, `dast-authenticated` is recorded as **UNVERIFIED** while anonymous DAST still runs.

## SAST custom rules

BaytMiftah Semgrep rules: `.semgrep/baytmiftah.yml`

Flags:

- Supabase service role in frontend
- Hard-coded JWTs / Resend keys / AWS keys
- PayAngels credentials
- `eval` / `new Function`
- Unsafe `innerHTML`

## Secrets scanning

Config: `.gitleaks.toml`

On detection:

1. **FAIL** the workflow
2. Report file path only (values redacted)
3. **Recommend rotation** — do not auto-rotate production credentials

## SCA policy

```bash
npm run security:sca
```

- **CRITICAL / HIGH** → FAIL (`npm audit --audit-level=high`)
- **MEDIUM / LOW** → reported, do not block by default
- Suppressions require reason, owner, date, expiry (no blanket ignore files)

Dependabot: `.github/dependabot.yml` (weekly npm + GitHub Actions)

## Local commands

```bash
npm run security:sast          # Semgrep (UNVERIFIED if CLI missing)
npm run security:sca           # npm audit high+
npm run security:secrets       # Gitleaks (UNVERIFIED if CLI missing)
npm run security:actions-audit # Workflow pattern audit
npm run security:unit          # API auth + RLS audit tests
npm run security:tenant        # Live tenant isolation (needs fixtures)
npm run security:summary       # Aggregate security-results/*.json
npm run security:all           # Run local suite + summary
npm run security:container     # Trivy filesystem scan
npm run security:branch-protection  # Apply main branch protection (GitHub Pro required)

Install optional CLIs once:

```bash
npm run security:install-tools   # downloads Gitleaks; installs Semgrep via pip if available
py -m pip install semgrep        # if pip install from script did not run
```

Then:

```bash
npm run security:sast          # Semgrep (PATH, pip, or Docker)
npm run security:secrets       # Gitleaks (cached binary or Docker)
npm run security:container     # Trivy filesystem (Docker or local trivy)
```

## Required GitHub configuration

### Repository secrets

| Secret | Used by |
|--------|---------|
| `VITE_SUPABASE_TEST_*` (4) | CI + security tenant isolation |
| `TENANT_FIXTURE_PASSWORD` | Optional fixture sign-in override |
| `SEMGREP_APP_TOKEN` | Optional Semgrep Cloud (action works without) |

### Environment: `staging`

| Variable / Secret | Purpose |
|-------------------|---------|
| `DAST_TARGET_URL` | Staging/preview URL for ZAP baseline |

## Branch protection

See **`docs/security/BRANCH_PROTECTION.md`**.

```bash
npm run security:branch-protection
```

Exits with code `2` on free private plans until GitHub Pro is enabled.

Required checks when supported:

- `build-and-test` (CI)
- `Analyze (javascript-typescript)` (CodeQL)
- `security-sast`
- `security-sca`
- `security-secrets`
- `security-summary`

## Failure policy

Real vulnerabilities **FAIL** the pipeline. Do not weaken checks to keep CI green.

## Exception policy

Any suppression must document:

- reason
- owner
- date
- expiry / review date

## Investigating findings

1. Download workflow artifact `security-summary`
2. Open GitHub **Security** tab for CodeQL / Dependabot
3. Reproduce locally with commands above
4. For secrets: rotate affected credential, remove from git history (`git filter-repo` or BFG), re-scan

## Credential rotation (leaked secret)

1. Revoke/rotate in provider console (Supabase, Resend, AWS, PayAngels, etc.)
2. Update GitHub Secrets / Vercel env
3. Remove secret from repository history
4. Re-run `npm run security:secrets`

## What this pipeline does NOT do

- No destructive testing against production
- No automatic RLS / payment / auth architecture changes
- No automatic secret rotation
- No Docker **image** build scan (filesystem Trivy scan runs instead)
