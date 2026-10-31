import { buildTransactionalEmail } from "./email-template.ts";

/** All Resend outbound mail must go through this helper (BaytMiftah transactional template). */
export type BrandedEmailInput = {
  to: string | string[];
  subject: string;
  title: string;
  body: string;
  siteUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  actionUrl?: string | null;
  preheader?: string;
};

export async function sendBrandedTransactionalEmail(
  input: BrandedEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_EMAIL_FROM");
  const replyTo = Deno.env.get("NOTIFICATION_EMAIL_REPLY_TO");

  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter(Boolean);
  if (!resendApiKey || !from || recipients.length === 0) {
    return { success: false, error: "Email provider is not configured" };
  }

  const emailContent = buildTransactionalEmail({
    siteUrl: input.siteUrl,
    title: input.title,
    body: input.body,
    ctaUrl: input.ctaUrl,
    ctaLabel: input.ctaLabel,
    actionUrl: input.actionUrl,
    preheader: input.preheader ?? input.body.slice(0, 120),
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: input.subject,
      text: emailContent.text,
      html: emailContent.html,
      reply_to: replyTo || undefined,
    }),
  });

  if (!response.ok) {
    return { success: false, error: await response.text() };
  }

  return { success: true };
}
