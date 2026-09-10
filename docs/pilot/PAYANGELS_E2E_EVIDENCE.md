# PayAngels live E2E evidence

**Last updated:** 2026-09-10

## Root cause fixed (2026-09-10)

Payment init failed because edge code defaulted to `https://api.payangels.com` (unreachable). Paystack-compatible keys require `PAYANGELS_API_BASE=https://api.paystack.co`.

## Probe

```bash
npm run ops:probe-payangels-api
```

**Result (2026-09-10):** HTTP 200, `Authorization URL created`, base `https://api.paystack.co`.

## Full E2E run (2026-09-10)

```bash
npm run pilot:payangels-e2e
```

| Step | Status | Detail |
|------|--------|--------|
| Auth | Pass | tenant fixture user |
| Payment init | Pass | `ph_pay_d9ef5fa31b154aa3b7` |
| Webhook replay | Pass | `PAYANGELS_SANDBOX_TEST_REFERENCE=ph_pay_1996cab48e80407ab8` |
| Refund | Skipped | Set `PILOT_TEST_TRANSACTION_ID` after paid transaction |
| Disbursement | Skipped | Set `PILOT_TEST_APPROVAL_ID` when distribution fixture exists |

## Listing / org

- Org: `siabanku` (`a2ea564b-a413-4752-b189-6f5ac5268a07`)
- Listing: `aad17bb4-9e9c-4508-a285-f6f2dea7ffd1`

## Supabase secrets required

- `PAYANGELS_SECRET_KEY`
- `PAYANGELS_WEBHOOK_SECRET` (or same as secret key for pilot)
- `PAYANGELS_API_BASE=https://api.paystack.co`
