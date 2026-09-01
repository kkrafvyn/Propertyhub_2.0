# BaytMiftah Security Architecture

## Boundary

BaytMiftah uses a shared React/Vite client, Supabase Auth/Postgres/Storage, server-side Edge Functions, and native Capacitor/Electron shells. The client is untrusted. Sensitive authorization, provider calls, financial mutation, and privileged operations belong in Postgres policies or Edge Functions.

## Trust layers

1. Identity: Supabase Auth, verified email where required, MFA assurance for privileged routes.
2. Authorization: organization membership, role/permission checks, resource ownership, and RLS.
3. Data: Postgres RLS, immutable financial ledgers, private sensitive buckets, signed URLs.
4. Integration: server-only provider secrets, signed/re-verified callbacks, replay protection, idempotency.
5. Operations: audit logs, rate limits, incident response, backups, recovery, CI checks.

## Security principles

- Zero trust for client input and external content.
- Least privilege for users, Edge Functions, Storage, and AI tools.
- Tenant isolation at database and server layers.
- Financial truth is append-only and deterministic.
- AI recommends or uses allowlisted tools; it does not receive arbitrary SQL or unrestricted database access.

## Verified versus pending

Verified in source: publishable client credentials, private KYC/maintenance/receipt buckets, PayAngels signature and provider re-verification, wallet immutability, Electron isolation, and baseline CI.

Pending deployment proof: complete RLS matrix testing, secret rotation, production monitoring, restore testing, mobile release signing, and penetration testing.
