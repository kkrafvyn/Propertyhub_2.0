# BaytMiftah Security Matrix

| Area | Control | Tool | Workflow | Frequency | Required secrets | Pass criteria | Failure severity | Owner |
|------|---------|------|----------|-----------|------------------|---------------|------------------|-------|
| SAST (Semgrep) | Static code analysis | Semgrep | `security.yml` → `security-sast` | push, PR, weekly | optional `SEMGREP_APP_TOKEN` | No ERROR findings | P1 High | Engineering |
| SAST (CodeQL) | GitHub semantic analysis | CodeQL | `codeql.yml` | push, PR, weekly | none | No critical CodeQL alerts | P0/P1 | Engineering |
| SCA | Dependency vulnerabilities | npm audit | `security.yml` → `security-sca` | push, PR, weekly | none | 0 critical/high | P1 High | Engineering |
| SCA (PR) | New dependency risk | Dependency Review | `security.yml` → `dependency-review` | pull_request | `GITHUB_TOKEN` | No new high+ vulns | P1 High | Engineering |
| Dependabot | Supply chain updates | Dependabot | `.github/dependabot.yml` | weekly | none | PRs opened for review | P2 Medium | Engineering |
| Secrets | Credential leak detection | Gitleaks | `security.yml` → `security-secrets` | push, PR, weekly | `GITHUB_TOKEN` | 0 leaks | P0 Critical | Security |
| Actions security | Workflow hardening audit | `audit-workflows.mjs` | `security.yml` → `security-actions-audit` | push, PR, weekly | none | 0 HIGH findings | P1 High | Security |
| API authorization | Platform admin separation | Vitest | `security.yml` → `security-unit` | push, PR, weekly | none | All tests pass | P0 Critical | Engineering |
| RLS audit | Migration RLS contract | Vitest | `security-unit` | push, PR, weekly | none | Sensitive tables have RLS | P1 High | Engineering |
| Tenant isolation | Cross-tenant denial (live) | Vitest + Supabase | `ci.yml` + `security:tenant` | every CI run; security on schedule | 4 `VITE_SUPABASE_TEST_*` | 0 cross-tenant reads/writes | P0 Critical | Security |
| Storage isolation | Cross-tenant bucket access | Vitest (live) | tenant-isolation suite | with fixtures | 4 test secrets | Empty/denied listing | P0 Critical | Security |
| DAST | Staging web scan | OWASP ZAP baseline | `security-dast.yml` | main push, weekly, manual | `DAST_TARGET_URL` (staging env) | Baseline pass | P1 High | Security |
| Container / FS scan | Filesystem + dependency CVEs | Trivy | `security-container` | push, PR, weekly | none | 0 CRITICAL | P0 Critical | Engineering |
| Authenticated DAST | Logged-in staging scan | OWASP ZAP + Supabase sign-in | `security-dast.yml` | main, weekly, manual | `DAST_TEST_*`, Supabase URL/key | Baseline pass | P1 High | Security |
| Build integrity | Compile + type safety | tsc, vite | `ci.yml` | push, PR | none | green build | P1 High | Engineering |
| E2E smoke | Critical user paths | Playwright | `ci.yml` | push, PR | test env vars | green E2E | P1 High | Engineering |
| Backup restore | DR evidence | restore-drill | `ci.yml` | push, PR | none | fixture drill pass | P2 Medium | Ops |
| Security summary | Gate aggregation | `security-summary.mjs` | `security.yml` → `security-summary` | push, PR, weekly | artifact inputs | GREEN or YELLOW | P0 if RED | Security |

## Attack matrix (tenant isolation)

| Principal | Action | Target | Expected |
|-----------|--------|--------|----------|
| Tenant A | SELECT | Tenant B org data | DENIED / empty |
| Tenant A | SELECT | Tenant B properties/listings | DENIED / empty |
| Tenant A | SELECT | Tenant B financial tables | DENIED / empty |
| Tenant A | LIST storage | Tenant B prefix | DENIED / empty |
| Tenant B | SELECT | Tenant A transactions | DENIED / empty |
| Workspace user | Admin console | `/admin` backend | DENIED (no grants) |
| Platform staff | Admin section | Unassigned grant | DENIED |
| Platform admin | Admin console | all sections | ALLOWED |

## Status vocabulary

| Status | Meaning |
|--------|---------|
| PASS | Check ran and succeeded |
| FAIL | Check ran and found blockers |
| UNVERIFIED | Check did not run or lacks prerequisites |
| SKIPPED | Explicitly skipped |
| DELEGATED | Verified in another workflow (e.g. tenant isolation in CI) |
| NOT APPLICABLE | Control not relevant (e.g. no containers) |

## Recommended branch protection checks

When available on your GitHub plan:

1. `build-and-test`
2. `Analyze (javascript-typescript)`
3. `security-sast`
4. `security-sca`
5. `security-secrets`
6. `security-summary`

Document only — run `npm run security:branch-protection` after upgrading to GitHub Pro.
