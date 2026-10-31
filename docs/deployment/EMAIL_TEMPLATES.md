# Email templates (BaytMiftah)

All **Resend** mail from Edge functions uses one branded **transactional** layout:

- Source: `supabase/functions/_shared/email-template.ts`
- Send path: `supabase/functions/_shared/resend-mail.ts` → `sendBrandedTransactionalEmail()`

Do **not** call `https://api.resend.com/emails` directly from new code; always go through `sendBrandedTransactionalEmail`.

## Covered today (Resend + template)

| Flow | Function |
|------|----------|
| Notification / outbound workspace email | `dispatch-notification` |
| Automations (alerts, leads, viewings, etc.) | `automation-dispatcher` |
| Workspace enrollment | `send-enrollment-notification` |
| Organization team invite | `send-organization-invite` |
| Local test | `npm run email:test -- you@example.com` |

## Supabase Auth mail (sign-up, password reset, magic link)

These are sent by **Supabase Auth**, not the Edge template, unless you configure:

1. **Custom SMTP** in Supabase → Project Settings → Auth → SMTP (Resend SMTP credentials), and  
2. **Email templates** in Auth → Email Templates (align copy/branding with BaytMiftah).

Invites no longer use Supabase’s default invite email; they use the branded Resend template from `send-organization-invite`.

## Logo in clients

Default header logo URL: `{PUBLIC_APP_URL}/brand/email-logo.svg`. Many clients block SVG — set Supabase secret `EMAIL_LOGO_URL` to a **PNG** on your CDN/app origin if needed.
