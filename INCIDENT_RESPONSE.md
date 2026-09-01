# BaytMiftah Incident Response

## Severity

- P0: active compromise, unauthorized financial movement, broad tenant exposure, or critical outage.
- P1: material security/control failure affecting a tenant, provider, or core workflow.
- P2: contained security weakness or degraded service with a workaround.
- P3: low-impact defect, suspicious signal, or documentation/control gap.

## Workflow

Detection -> Classification -> Owner -> Containment -> Investigation -> Mitigation -> Communication -> Recovery -> Verification -> Postmortem.

## First actions

1. Open an incident record with time, reporter, affected service, tenant scope, and evidence.
2. Preserve logs and audit records; do not overwrite historical financial or security evidence.
3. Revoke exposed credentials/tokens and disable affected kill switches where available.
4. Restrict affected accounts, providers, exports, or integrations using least privilege.
5. Notify the incident owner and required business/legal stakeholders according to severity.
6. Verify recovery with a targeted test, then record root cause and corrective actions.

## Evidence

Capture request IDs, user/org IDs, resource IDs, timestamps, provider references, audit events, deployment version, before/after state, decisions, and communications. Never place secrets in incident records.

## Current gap

The repository documents the workflow, but production paging, ownership roster, communications templates, and tested incident records still need operational setup.
