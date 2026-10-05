# PayAngels live E2E evidence

> **Invalidated 2026-10-05:** this run exercised Paystack endpoints through a renamed adapter, not the PayAngel Business API. It is retained only as historical evidence and must not be used to set `PAYANGELS_LIVE_CERTIFIED=true`.

**Last updated:** 2026-09-10

## Historical diagnosis (not PayAngel certification)

The old adapter was pointed at Paystack. A successful Paystack response does not prove PayAngel configuration.

## Probe

```bash
npm run ops:probe-payangels-api
```

**Historical result (invalid for PayAngel):** a Paystack endpoint returned HTTP 200.

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
- distinct provider-issued `PAYANGELS_WEBHOOK_SECRET`
- provider-issued `PAYANGELS_API_BASE` and `PAYANGELS_DISBURSEMENT_URL`
- reviewed private API contract and a new complete certification run
