# Branch Protection — BaytMiftah

GitHub **branch protection** on `main` requires **GitHub Pro** (or Team/Enterprise) for **private** repositories. The free plan blocks API setup with:

> Upgrade to GitHub Pro or make this repository public to enable this feature.

## Required status checks

When your plan supports branch protection, enable these checks on `main`:

| Check name | Workflow | Job |
|------------|----------|-----|
| `build-and-test` | CI | `build-and-test` |
| `Analyze (javascript-typescript)` | CodeQL | `analyze` |
| `security-sast` | Security | `security-sast` |
| `security-sca` | Security | `security-sca` |
| `security-secrets` | Security | `security-secrets` |
| `security-summary` | Security | `security-summary` |

Recommended additional settings:

- Require 1 pull request review before merge
- Dismiss stale reviews
- Require branches to be up to date
- Block force pushes
- Block deletions
- Enforce for administrators

## Apply automatically

After upgrading to GitHub Pro:

```bash
npm run security:branch-protection
```

Or manually:

```bash
gh auth login
npm run security:branch-protection
```

The script exits with code `2` when the plan does not support protection (no accidental silent success).

## Apply manually in GitHub UI

1. **Settings** → **Branches** → **Add rule** for `main`
2. Enable **Require status checks to pass**
3. Search and select each check listed above
4. Enable **Require a pull request before merging** (1 approval)
5. Enable **Do not allow bypassing the above settings**

## Until branch protection is available

- Security and CI workflows still run on every push/PR
- Direct pushes to `main` are not blocked by GitHub rules on the free private plan
- Use team discipline: merge via PR only after checks are green
