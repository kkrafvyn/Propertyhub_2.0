# BaytMiftah Payment Security

## Controls

- Never trust client payment success.
- Verify provider state server-side before marking a payment successful.
- Use unique provider event IDs and payment references for replay protection.
- Enforce amount, currency, organization, and transaction-reference matching.
- Make ledger entries immutable and idempotent.
- Require approval/step-up authentication for high-risk refunds, payouts, and bulk changes.
- Record provider event, actor, organization, amount, currency, result, and audit reference.

## Current implementation

PayAngels webhook signature verification, provider re-verification, webhook uniqueness, wallet idempotency, and immutable ledger triggers are present. MTN MoMo now requires a configured HMAC callback secret and provider-status re-verification.

## Current gap

MoMo provider callback support must be configured and tested in the deployed environment. Payment reconciliation transaction/locking evidence, step-up controls for every high-risk path, and independent provider certification remain pending.
