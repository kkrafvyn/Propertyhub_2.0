# BaytMiftah Webhook Security

## Required controls

Each webhook must validate method, authenticity/signature, timestamp/replay window where supported, payload schema, event identity, and provider state. Processing must be idempotent, retry-safe, rate-limited, logged, and fail closed on verification errors.

## Implemented boundaries

PayAngels validates its signature and re-queries transaction state. MoMo validates `MTN_MOMO_CALLBACK_SECRET` HMAC from `x-momo-signature` or `x-momo-webhook-signature`, records replay IDs, and re-queries collection/disbursement status before mutation.

## Deployment requirement

Set `MTN_MOMO_CALLBACK_SECRET` in Supabase Edge Function secrets and configure the provider to send the matching HMAC. Do not place it in client/mobile code.

## Current gap

Provider-specific timestamp/replay contract, automated forged-payload tests, and production monitoring/alerting still require deployment verification.
