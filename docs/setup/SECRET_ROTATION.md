# Secret Rotation Procedure

1. Treat any credential present in a local environment file, log, screenshot, or commit as compromised.
2. Revoke/rotate the provider or database credential in its authoritative console.
3. Update only the deployment secret store (Supabase/Vercel/CI); never the React client or mobile bundle.
4. Verify old credentials fail and new credentials work in staging.
5. Review Git history, CI logs, backups, and artifacts for leakage.
6. Record secret name, owner, rotation time, affected services, verification result, and next rotation date. Never record secret values.

Current action: rotate all credential-bearing values found during the 2026-08-27 repository audit before any live deployment.
