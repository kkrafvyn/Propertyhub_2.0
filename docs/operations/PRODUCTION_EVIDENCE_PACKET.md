# BaytMiftah Production Evidence Packet

Use this packet to prove that external launch dependencies are ready. Do not paste raw API keys, passwords, private keys, webhook secrets, bank credentials, Ghana Card numbers, biometric images, or tenant access codes into this document.

## Evidence Index

| Workstream | Required before live use | Evidence owner | Status |
| --- | --- | --- | --- |
| Paystack live payments | Live keys, plans, webhook, refund, transfer, duplicate webhook proof | Finance/Ops/Engineering | Pending external keys |
| Stripe live payments | Live keys, price IDs, webhook, refund, transfer or Connect proof | Finance/Ops/Engineering | Pending external keys |
| Flutterwave live payments | Live keys, plan IDs, webhook, refund, transfer, fallback proof | Finance/Ops/Engineering | Pending external keys |
| SMS and WhatsApp | Sender/number approval, opt-in, opt-out, delivery, rate-limit proof | Ops/Engineering/Legal | Pending provider setup |
| USSD | Short code, webhook, handoff, failure, abuse-control proof | Ops/Engineering/Legal | Pending provider setup |
| Ghana Card and liveness | DPIA, consent, manual fallback, vendor sandbox proof | Legal/Ops/Engineering | Pending vendor |
| Lands Commission/manual registry | SOP, source evidence, disclaimer approval, sample verification | Legal/Ops/Product | Pending provider/SOP |
| Hyperlocal data | Source agreement, confidence labels, update schedule, sample import | Product/Data/Legal | Pending data sources |
| Fraud providers | Image, device risk, sanctions/PEP proof and human-review SOP | Trust/Safety/Legal | Pending providers |
| Smart Property Access | Real device test, revoke test, outage fallback, privacy wording | Ops/Engineering/Legal | Pending devices |
| Backup and restore | Backup source, restore target, timing, verification query, screenshots/logs | Engineering/Ops | Pending drill |
| Monitoring | Error tracking, uptime, log drain, alert recipients, test incident | Engineering/Ops | Pending provider |
| Legal policies | Counsel approval for Terms, Privacy, Escrow, Refund, KYC/AML, IoT, AI | Legal/Product | Pending signoff |

## Payment Provider Sandbox Evidence

Copy this section once per provider: Paystack, Stripe, and Flutterwave.

| Field | Value |
| --- | --- |
| Provider |  |
| Environment | Sandbox / Live low-value |
| Dashboard account ID |  |
| Webhook URL |  |
| Webhook signature enabled | Yes / No |
| Tested by |  |
| Tested at |  |
| Evidence link |  |

| Scenario | Reference | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| Successful payment |  | Payment confirmed and ledger updated |  | Pending |
| Failed payment |  | Failure recorded without activation/release |  | Pending |
| Duplicate webhook |  | Idempotency prevents duplicate ledger rows |  | Pending |
| Subscription renewal |  | Subscription stays active and payment recorded |  | Pending |
| Subscription failure |  | Grace/past-due flow starts and notification is sent |  | Pending |
| Refund |  | Refund initiated and ledger updated |  | Pending |
| Chargeback/dispute |  | Dispute state recorded and funds frozen where applicable |  | Pending |
| Transfer/release |  | Funds release to approved recipient only |  | Pending |
| Provider fallback |  | Unavailable provider falls back to configured secondary lane |  | Pending |

## Backup Restore Drill Evidence

| Field | Value |
| --- | --- |
| Backup provider | Supabase / Other |
| Backup source |  |
| Restore target |  |
| Started at |  |
| Completed at |  |
| RPO observed |  |
| RTO observed |  |
| Verified by |  |
| Evidence link |  |

Verification queries to run after restore:

```sql
select count(*) from public.users;
select count(*) from public.organizations;
select count(*) from public.properties;
select count(*) from public.property_transactions;
select count(*) from public.integrity_audit_log;
```

Pass criteria:

- Restored database opens without migration errors.
- Critical tables are present.
- RLS remains enabled on exposed public tables.
- Audit log rows are readable by authorized admins only.
- No service-role secret appears in restored frontend/client configuration.

## Smart Property Access Live Device Evidence

| Scenario | Device/provider | Listing type | Expected result | Status |
| --- | --- | --- | --- | --- |
| Create viewing access code |  | Home / Office / Warehouse / Car park | Time-limited code created | Pending |
| Revoke viewing code |  |  | Code no longer works | Pending |
| Tenant permanent access |  |  | Tenant credential created after approval | Pending |
| Move-out revocation |  |  | Tenant credential revoked | Pending |
| Provider offline |  |  | User sees safe fallback and support path | Pending |
| Failed unlock |  |  | Failure logged without repeated unsafe retries | Pending |
| Entry event log |  |  | Metadata recorded without camera storage | Pending |
| Emergency lockout |  |  | Manual support process followed | Pending |

## Communications Evidence

| Channel | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| Email | Invite, billing failure, viewing, escrow receipt | Delivered and branded correctly | Pending |
| SMS | Viewing reminder, payment confirmation, opt-out | Delivered, opt-out honored | Pending |
| WhatsApp | Approved template event | Delivered only after opt-in | Pending |
| USSD | Payment handoff | Transaction handoff succeeds or fails safely | Pending |

## Identity, Registry, And Data Evidence

| Check | Consent required | Manual fallback | Evidence link | Status |
| --- | --- | --- | --- | --- |
| Ghana Card OCR | Yes | Yes |  | Pending |
| Liveness check | Yes | Yes |  | Pending |
| Business registration check | Yes | Yes |  | Pending |
| Tax/SSNIT/GRA-related check, if used | Yes | Yes |  | Pending |
| Lands Commission/title source | Case dependent | Yes |  | Pending |
| Flood/drainage data | No personal data | Yes |  | Pending |
| Power/water reliability data | No personal data | Yes |  | Pending |
| Safety/transit/commercial density data | No personal data | Yes |  | Pending |

## Monitoring Evidence

| Area | Required proof | Status |
| --- | --- | --- |
| Error tracking | Test client and server error are captured | Pending |
| Uptime monitoring | Public app, auth, search, workspace, and admin paths checked | Pending |
| Log drain | Vercel/Supabase logs forwarded to approved destination | Pending |
| Alert routing | Primary and backup responders receive a test incident | Pending |
| Incident runbook | Payment, auth, database, IoT, and provider outage paths documented | Pending |

## Final Signoff

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Engineering |  | Approved / Blocked |  |  |
| Product |  | Approved / Blocked |  |  |
| Finance/Ops |  | Approved / Blocked |  |  |
| Legal |  | Approved / Blocked |  |  |
| Trust and Safety |  | Approved / Blocked |  |  |
| Security |  | Approved / Blocked |  |  |
