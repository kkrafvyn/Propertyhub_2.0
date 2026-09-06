# Security Release Gate (Phase 2)

Every production release must pass this gate. Workflows live in `.github/workflows/`.

## Pipeline

```text
Git push / PR
    ↓
CI (build, typecheck, unit tests, E2E)
    ↓
SAST (Semgrep)          → .github/workflows/security.yml
    ↓
SCA (npm audit)         → npm run security:sca
    ↓
Secrets (Gitleaks)      → .gitleaks.toml
    ↓
CodeQL                  → .github/workflows/codeql.yml
    ↓
Tenant isolation        → src/lib/security/tenant-isolation.test.ts
    ↓
Backup restore drill    → ci.yml (scheduled)
    ↓
DAST (staging only)     → .github/workflows/security-dast.yml
    ↓
Security gate           → npm run security:all
    ↓
Deploy (Vercel / Supabase functions)
```

## Local commands

```bash
npm run security:sast
npm run security:sca
npm run security:secrets
npm run security:tenant
npm run security:all
```

## AI security (BaytMiftah AI Gateway rules)

All LLM / tool calls must:

1. Authenticate the user (`requireAuthenticatedUser`)
2. Resolve organization and call `assertOrgAiEnabled`
3. Enforce rate limits (`enforceRateLimit`)
4. Respect org kill switch (`ai_org_controls.globally_enabled`)
5. Log actions to `estate_ai_action_logs` where applicable
6. Never bypass human review for KYC final approval

Edge Functions using this pattern today: `ai-assistant`, `kyc-ai-screen`, `parse-search-query`.

KYC provider webhooks (`kyc-smile-webhook`) verify HMAC signatures before mutating `kyc_submissions`.

## Tenant isolation

- RLS on all tenant tables
- `tenant-isolation.test.ts` with staging fixtures (`VITE_SUPABASE_TEST_*`)
- No `VITE_ENABLE_DEMO_DATA=true` in production

## API authorization

- Workspace: `workspace-permissions.ts` + RLS helpers
- Platform admin: `platform-access.ts` + console grants
- Server RPCs: `SECURITY DEFINER` with explicit permission checks

## Release checklist

- [ ] CI green on `main`
- [ ] No high/critical npm audit without documented exception
- [ ] Semgrep / Gitleaks clean
- [ ] Migrations applied (`npm run db:push`)
- [ ] Edge function secrets set (Smile, OpenAI, payments)
- [ ] `VITE_APP_VERSION` bumped; `APP_LATEST_VERSION` secret updated
- [ ] Desktop installer rebuilt if desktop changes (`npm run desktop:release`)

## Staging DAST

Set in CI secrets (never production):

- `DAST_TARGET_URL`
- `DAST_TEST_EMAIL` / `DAST_TEST_PASSWORD`
- `DAST_SUPABASE_URL` / `DAST_SUPABASE_ANON_KEY`
