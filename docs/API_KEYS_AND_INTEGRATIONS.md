# BaytMiftah API Keys & Integration Links

Copy `.env.example` to `.env` and fill values. Set **Supabase Edge Function secrets** for server-only keys (never expose in `VITE_*`).

## Supabase (required)

| Variable | Purpose | Get it |
|---|---|---|
| `SUPABASE_PROJECT_REF` | Project identifier | [Supabase Dashboard](https://supabase.com/dashboard) |
| `VITE_SUPABASE_URL` | Client API URL | Project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | Project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin / Edge Functions | Project → Settings → API (**server only**) |
| `SUPABASE_ACCESS_TOKEN` | CLI deploy | [Account tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | `npm run db:push` | Project → Settings → Database |

## KYC — Smile Identity (Ghana / Africa — recommended)

| Variable | Purpose | Get it |
|---|---|---|
| `SMILE_PARTNER_ID` | Partner ID | [Smile Portal](https://portal.usesmileid.com) → Dashboard |
| `SMILE_API_KEY` | API key (sandbox vs prod differ) | Portal → **Developer Settings** → Generate API Key |
| `SMILE_ENVIRONMENT` | `sandbox` or `production` | — |
| `SMILE_CALLBACK_URL` | Webhook URL | `https://<project-ref>.supabase.co/functions/v1/kyc-smile-webhook` |

**Docs**

- Main docs: [https://docs.usesmileid.com](https://docs.usesmileid.com)
- Ghana ID verification: [https://docs.usesmileid.com/products/for-individuals-kyc/id-verification/id-number-verification/ghana](https://docs.usesmileid.com/products/for-individuals-kyc/id-verification/id-number-verification/ghana)
- Webhooks: [https://docs.usesmileid.com/further-reading/verification-webhooks](https://docs.usesmileid.com/further-reading/verification-webhooks)
- Node SDK: [https://github.com/smileidentity/smile-identity-core-js](https://github.com/smileidentity/smile-identity-core-js)

**Edge Functions:** `kyc-smile-verify`, `kyc-smile-webhook`, `kyc-ai-screen` (secondary AI pre-screen)

## KYC — AI pre-screen (secondary, not a KYC vendor)

| Variable | Purpose | Get it |
|---|---|---|
| `OPENAI_API_KEY` | Vision + text for `kyc-ai-screen` | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | Default `gpt-4o-mini` | — |
| `QWEN_API_KEY` | Alternative LLM | [DashScope](https://dashscope.console.aliyun.com) |
| `AI_PROVIDER` | `openai` or `qwen` | — |

## KYC — Alternative global vendors (not integrated yet)

| Provider | Portal | Docs |
|---|---|---|
| Sumsub | [cockpit.sumsub.com](https://cockpit.sumsub.com) | [docs.sumsub.com](https://docs.sumsub.com) |
| Persona | [app.withpersona.com](https://app.withpersona.com) | [docs.withpersona.com](https://docs.withpersona.com) |
| Onfido | [dashboard.onfido.com](https://dashboard.onfido.com) | [documentation.onfido.com](https://documentation.onfido.com) |
| Veriff | [station.veriff.com](https://station.veriff.com) | [devdocs.veriff.com](https://devdocs.veriff.com) |

Env placeholders when integrated: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_WEBHOOK_SECRET`.

## Tenant screening (US leases — stub)

| Variable | Purpose | Get it |
|---|---|---|
| `TRANSUNION_API_KEY` | TransUnion SmartMove | [mysmartmove.com](https://www.mysmartmove.com) partner onboarding |

## Payments (PayAngels — sole checkout rail)

| Variable | Purpose | Get it |
|---|---|---|
| `VITE_PAYANGELS_PUBLIC_KEY` | Client inline checkout | PayAngels merchant portal |
| `PAYANGELS_SECRET_KEY` | Server init / verify | Same |
| `PAYANGELS_WEBHOOK_SECRET` | Webhook verification | Same |
| `PAYANGELS_API_BASE` | API host (operator-set) | PayAngels onboarding docs — not Stripe |

## Communications

| Variable | Purpose | Get it |
|---|---|---|
| `RESEND_API_KEY` | Transactional email | [resend.com/api-keys](https://resend.com/api-keys) |
| `TWILIO_ACCOUNT_SID` | SMS / WhatsApp | [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Same |

## App versioning & update notifications

| Variable | Purpose | Notes |
|---|---|---|
| `VITE_APP_VERSION` | Client build version | Bump on each release |
| `VITE_APP_LATEST_VERSION` | Latest available (fallback) | Or Edge secret `APP_LATEST_VERSION` |
| `VITE_APP_MINIMUM_VERSION` | Force-update threshold | Or `APP_MINIMUM_VERSION` secret |
| `VITE_APP_FORCE_UPDATE` | Block app until refresh | `true` / `false` |
| `VITE_APP_CHANGELOG` | Banner message | Short release note |
| `VITE_DESKTOP_DOWNLOAD_URL` | Desktop installer URL | CDN or `/downloads/...` |
| `APP_LATEST_VERSION` | Edge `app-version` function | Supabase secrets |
| `APP_MINIMUM_VERSION` | Edge force-update | Supabase secrets |
| `DESKTOP_DOWNLOAD_URL` | Desktop download for Edge | Supabase secrets |

**Edge Function:** `app-version` — polled by web/desktop on load; shows `AppUpdateBanner`.

## Desktop

| Variable | Purpose |
|---|---|
| `VITE_DESKTOP_DOWNLOAD_URL` | Download button / update banner |
| `ELECTRON_BUILD=true` | Set by `npm run build:desktop` |
| `VITE_DESKTOP_WORKSPACE_ONLY=true` | Workspace-only desktop shell |

Build: `npm run desktop:release`

## AWS (backup / future migration — optional now)

| Variable | Purpose | Get it |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | S3 offsite backups | [AWS IAM](https://console.aws.amazon.com/iam/) |
| `AWS_SECRET_ACCESS_KEY` | S3 secret | Same |
| `AWS_REGION` | e.g. `eu-west-1` | — |
| `BACKUP_S3_BUCKET` | Dedicated backup bucket | S3 console |

See [AWS_MIGRATION_PREP.md](./AWS_MIGRATION_PREP.md).

## Deploy checklist after adding keys

```bash
cp .env.example .env
npx supabase secrets set SMILE_PARTNER_ID=... SMILE_API_KEY=... SMILE_CALLBACK_URL=...
npx supabase functions deploy kyc-smile-verify kyc-smile-webhook app-version
npm run db:push
```
