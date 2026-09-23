import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTransactionalEmail } from "../_shared/email-template.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getEnrollmentReviewStaffEmails } from "../_shared/platform-staff.ts";

type EnrollmentEvent = "submitted" | "approved" | "rejected" | "withdrawn";

function jsonResponse(status: number, body: Record<string, unknown>, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function getAppUrl(req: Request, explicitAppUrl?: string) {
  if (explicitAppUrl) return explicitAppUrl.replace(/\/+$/, "");
  const configured =
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    Deno.env.get("VITE_APP_ORIGIN");
  if (configured) return configured.replace(/\/+$/, "");
  const requestUrl = new URL(req.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

async function sendEmail(params: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_EMAIL_FROM");
  const replyTo = Deno.env.get("NOTIFICATION_EMAIL_REPLY_TO");

  if (!resendApiKey || !from) {
    return { success: false, error: "Email provider is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
      reply_to: replyTo || undefined,
    }),
  });

  if (!response.ok) {
    return { success: false, error: await response.text() };
  }

  return { success: true };
}

function buildEnrollmentCopy(
  event: EnrollmentEvent,
  input: {
    companyName: string;
    slug: string;
    reviewNotes?: string | null;
    appUrl: string;
  },
) {
  const statusUrl = `${input.appUrl}/enrollment`;

  switch (event) {
    case "submitted":
      return {
        subject: `We received your BaytMiftah workspace application — ${input.companyName}`,
        body: `Thank you for applying to bring ${input.companyName} onto BaytMiftah.\n\nYour requested workspace slug is /${input.slug}. Our team will review your company profile and email you when a decision is made.\n\nTrack your application anytime:\n${statusUrl}`,
        actionUrl: statusUrl,
        actionLabel: "View application status",
      };
    case "approved":
      return {
        subject: `Approved — ${input.companyName} workspace is ready`,
        body: `Great news — ${input.companyName} has been approved on BaytMiftah.\n\nYour workspace is live at /${input.slug}. Sign in to complete company setup, invite your team, and start managing properties.\n\nOpen workspace: ${input.appUrl}/workspace/${input.slug}${
          input.reviewNotes ? `\n\nNote from our team: ${input.reviewNotes}` : ""
        }`,
        actionUrl: `${input.appUrl}/workspace/${input.slug}`,
        actionLabel: "Open your workspace",
      };
    case "rejected":
      return {
        subject: `Update on your BaytMiftah workspace application`,
        body: `Thank you for your interest in BaytMiftah. We were unable to approve the workspace application for ${input.companyName} at this time.${
          input.reviewNotes ? `\n\nReason: ${input.reviewNotes}` : ""
        }\n\nYou can review your application or submit a revised request:\n${statusUrl}`,
        actionUrl: statusUrl,
        actionLabel: "View application status",
      };
    case "withdrawn":
      return {
        subject: `Application withdrawn — ${input.companyName}`,
        body: `Your workspace application for ${input.companyName} (/${input.slug}) has been withdrawn.\n\nYou can submit a new application whenever you are ready:\n${input.appUrl}/workspace`,
        actionUrl: `${input.appUrl}/workspace`,
        actionLabel: "Apply for a workspace",
      };
  }
}

function buildAdminSubmittedCopy(input: {
  companyName: string;
  slug: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  description?: string | null;
  appUrl: string;
}) {
  const reviewUrl = `${input.appUrl}/admin/organizations`;
  const applicantLine = [
    input.requesterName,
    input.requesterEmail || input.contactEmail,
  ]
    .filter(Boolean)
    .join(" — ");

  const detailLines = [
    `Company: ${input.companyName}`,
    `Requested slug: /${input.slug}`,
    applicantLine ? `Applicant: ${applicantLine}` : null,
    input.contactPhone ? `Phone: ${input.contactPhone}` : null,
    input.description ? `\nAbout the company:\n${input.description}` : null,
  ].filter(Boolean);

  return {
    subject: `New workspace enrollment — ${input.companyName}`,
    body: `A new company workspace application is waiting for review.\n\n${detailLines.join("\n")}\n\nReview in the admin console:\n${reviewUrl}`,
    actionUrl: reviewUrl,
    actionLabel: "Review enrollment request",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase environment configuration" }, req);
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header" }, req);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "You must be signed in" }, req);
  }
  const { error: accessError } = await userClient.rpc("enforce_account_access");
  if (accessError) return jsonResponse(403, { error: "Account access has been revoked or could not be verified" }, req);

  const body = await req.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const event = typeof body?.event === "string" ? (body.event as EnrollmentEvent) : null;
  const appUrl = typeof body?.appUrl === "string" ? body.appUrl : undefined;

  if (!requestId || !event || !["submitted", "approved", "rejected", "withdrawn"].includes(event)) {
    return jsonResponse(400, { error: "requestId and valid event are required" }, req);
  }

  const { data: enrollment, error: enrollmentError } = await adminClient
    .from("organization_enrollment_requests")
    .select("*, requester:users!organization_enrollment_requests_requester_user_id_fkey(id, email, full_name)")
    .eq("id", requestId)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    return jsonResponse(404, { error: "Enrollment request not found" }, req);
  }

  const requester = Array.isArray(enrollment.requester)
    ? enrollment.requester[0]
    : enrollment.requester;

  const isRequester = enrollment.requester_user_id === user.id;
  const { data: profile } = await adminClient
    .from("users")
    .select("is_platform_admin, platform_console_grants")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformStaff =
    profile?.is_platform_admin ||
    (Array.isArray(profile?.platform_console_grants) &&
      profile.platform_console_grants.includes("organizations"));

  if ((event === "submitted" || event === "withdrawn") && !isRequester) {
    return jsonResponse(403, { error: "Only the applicant can trigger applicant notifications" }, req);
  }

  if ((event === "approved" || event === "rejected") && !isPlatformStaff) {
    return jsonResponse(403, { error: "Platform staff required for review notifications" }, req);
  }

  const recipientEmail =
    enrollment.contact_email || requester?.email || null;

  if (!recipientEmail) {
    return jsonResponse(200, { success: false, skipped: true, reason: "No recipient email" });
  }

  const copy = buildEnrollmentCopy(event, {
    companyName: enrollment.company_name,
    slug: enrollment.desired_slug,
    reviewNotes: enrollment.review_notes,
    appUrl: getAppUrl(req, appUrl),
  });

  const emailContent = buildTransactionalEmail({
    title: copy.subject,
    body: copy.body,
    actionUrl: copy.actionUrl,
    ctaLabel: copy.actionLabel,
  });

  const delivery = await sendEmail({
    to: recipientEmail,
    subject: copy.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (!delivery.success) {
    return jsonResponse(200, {
      success: false,
      error: delivery.error || "Email delivery failed",
    });
  }

  let adminNotification: Record<string, unknown> | undefined;

  if (event === "submitted") {
    const staffEmails = await getEnrollmentReviewStaffEmails(adminClient);

    if (staffEmails.length === 0) {
      adminNotification = { success: false, skipped: true, reason: "No platform staff emails" };
    } else {
      const adminCopy = buildAdminSubmittedCopy({
        companyName: enrollment.company_name,
        slug: enrollment.desired_slug,
        contactEmail: enrollment.contact_email,
        contactPhone: enrollment.contact_phone,
        requesterName: requester?.full_name ?? null,
        requesterEmail: requester?.email ?? null,
        description: enrollment.description,
        appUrl: getAppUrl(req, appUrl),
      });

      const adminEmailContent = buildTransactionalEmail({
        title: adminCopy.subject,
        body: adminCopy.body,
        actionUrl: adminCopy.actionUrl,
        ctaLabel: adminCopy.actionLabel,
      });

      const adminDelivery = await sendEmail({
        to: staffEmails,
        subject: adminCopy.subject,
        text: adminEmailContent.text,
        html: adminEmailContent.html,
      });

      adminNotification = adminDelivery.success
        ? { success: true, recipientCount: staffEmails.length }
        : { success: false, error: adminDelivery.error || "Admin email delivery failed" };
    }
  }

  return jsonResponse(200, { success: true, adminNotification });
});
