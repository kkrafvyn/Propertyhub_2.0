# Email setup (Resend)

Transactional email uses the **`email`** edge function + [Resend](https://resend.com).

## 1. Resend account

1. Sign up at [resend.com](https://resend.com)
2. **API Keys** → create key → copy `re_...`

## 2. Verify sending domain

1. Resend → **Domains** → Add domain (e.g. `baytmiftah.com` or your Vercel domain)
2. Add DNS records Resend provides (SPF, DKIM, optional DMARC)
3. Wait for **Verified** status (usually minutes to 24h)

Until verified, Resend only sends to your account email (test mode).

## 3. Supabase Edge secrets

Dashboard → Edge Functions → Secrets:

```
RESEND_API_KEY=re_...
EMAIL_FROM=BaytMiftah <noreply@yourdomain.com>
```

`EMAIL_FROM` must use the **verified domain**.

## 4. Test

```powershell
# After signing in via the app, welcome email:
curl -X POST "%VITE_SUPABASE_URL%/functions/v1/email" ^
  -H "apikey: %VITE_SUPABASE_ANON_KEY%" ^
  -H "Authorization: Bearer <user_access_token>" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"welcome\"}"
```

Or trigger from app flows (sign-up welcome, viewing confirmations via `communications` edge).

## 5. Outbox

Failed sends queue in `email_outbox` table. Staff can inspect via Supabase SQL editor.

## Related

- SMS/WhatsApp: Twilio secrets on `communications` edge (`TWILIO_*`)
- Deploy guide: `docs/DEPLOY.md`
