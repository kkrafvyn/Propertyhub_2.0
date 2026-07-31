import { buildTransactionalEmail } from "../_shared/email-template.ts";
import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type NotificationChannel = "in_app" | "email" | "sms";

function getAuthorizedAutomationKey(req: Request) {
  const apiKey = req.headers.get("apikey");
  const authorization = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const internalKey = Deno.env.get("INTERNAL_AUTOMATIONS_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const candidate = apiKey || authorization;
  if (!candidate) {
    throw new HttpError(401, "Missing automation key");
  }

  if (candidate !== internalKey && candidate !== serviceRoleKey) {
    throw new HttpError(403, "Invalid automation key");
  }
}

function frequencyIntervalMs(frequency: string) {
  switch (frequency) {
    case "weekly":
      return 1000 * 60 * 60 * 24 * 7;
    case "daily":
      return 1000 * 60 * 60 * 24;
    default:
      return 1000 * 60 * 5;
  }
}

function isDue(lastCheckedAt: string | null | undefined, frequency: string) {
  if (!lastCheckedAt) return true;
  return Date.now() - new Date(lastCheckedAt).getTime() >= frequencyIntervalMs(frequency);
}

function formatDateTime(value?: string | null) {
  if (!value) return "soon";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizePropertyCategory(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["apartment", "flat", "condo"].includes(normalized)) return "apartment";
  if (["house", "home", "villa", "duplex"].includes(normalized)) return "house";
  if (["office", "workspace"].includes(normalized)) return "office";
  if (["commercial", "shop", "retail"].includes(normalized)) return "commercial";
  if (["land", "plot"].includes(normalized)) return "land";
  return normalized;
}

function matchesSavedAlert(alert: any, listing: any) {
  const property = listing.property;
  const locationNeedle = String(alert.location_query || "").trim().toLowerCase();
  const locationHaystack = [
    property?.address,
    property?.city,
    property?.region,
    property?.country,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (alert.price_min && Number(listing.price || 0) < Number(alert.price_min)) return false;
  if (alert.price_max && Number(listing.price || 0) > Number(alert.price_max)) return false;
  if (alert.listing_type && listing.listing_type !== alert.listing_type) return false;
  if (
    alert.property_type &&
    normalizePropertyCategory(property?.category) !== normalizePropertyCategory(alert.property_type)
  ) {
    return false;
  }
  if (alert.bedrooms && Number(property?.bedrooms || 0) < Number(alert.bedrooms)) return false;
  if (alert.bathrooms && Number(property?.bathrooms || 0) < Number(alert.bathrooms)) return false;
  if (locationNeedle && !locationHaystack.includes(locationNeedle)) return false;

  return true;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_EMAIL_FROM");
  if (!resendApiKey || !from || !params.to) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
      reply_to: Deno.env.get("NOTIFICATION_EMAIL_REPLY_TO") || undefined,
    }),
  });

  return response.ok;
}

async function sendSms(params: { to: string; body: string }) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber || !params.to) return false;

  const encoded = new URLSearchParams({
    To: params.to,
    From: fromNumber,
    Body: params.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encoded.toString(),
    }
  );

  return response.ok;
}

async function createNotification(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    channel: NotificationChannel;
    notificationType: string;
    subject: string;
    content: string;
    actionUrl?: string | null;
    delivered?: boolean;
  }
) {
  await admin.from("notification_logs").insert({
    user_id: input.userId,
    notification_type: input.notificationType,
    channel: input.channel,
    subject: input.subject,
    content: input.content,
    action_url: input.actionUrl || null,
    delivered: input.delivered ?? input.channel === "in_app",
    delivered_at: input.delivered === false ? null : new Date().toISOString(),
    read: false,
  });
}

async function notifyUser(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    subject: string;
    content: string;
    notificationType: string;
    actionUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    sendEmailCopy?: boolean;
    sendSmsCopy?: boolean;
  }
) {
  await createNotification(admin, {
    userId: input.userId,
    channel: "in_app",
    notificationType: input.notificationType,
    subject: input.subject,
    content: input.content,
    actionUrl: input.actionUrl,
  });

  if (input.sendEmailCopy && input.email) {
    const emailContent = buildTransactionalEmail({
      title: input.subject,
      body: input.content,
      actionUrl: input.actionUrl,
    });
    const delivered = await sendEmail({
      to: input.email,
      subject: input.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    await createNotification(admin, {
      userId: input.userId,
      channel: "email",
      notificationType: input.notificationType,
      subject: input.subject,
      content: input.content,
      actionUrl: input.actionUrl,
      delivered,
    });
  }

  if (input.sendSmsCopy && input.phone) {
    const delivered = await sendSms({
      to: input.phone,
      body: input.content,
    });

    await createNotification(admin, {
      userId: input.userId,
      channel: "sms",
      notificationType: input.notificationType,
      subject: input.subject,
      content: input.content,
      actionUrl: input.actionUrl,
      delivered,
    });
  }
}

async function runRentReminders(admin: ReturnType<typeof createAdminClient>) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const upcomingCutoff = new Date(today);
  upcomingCutoff.setDate(upcomingCutoff.getDate() + 3);
  const upcomingIso = upcomingCutoff.toISOString().slice(0, 10);

  const { data: scheduleRows, error } = await admin
    .from("lease_rent_schedule")
    .select(`
      id,
      due_date,
      amount_minor,
      currency,
      status,
      reminded_at,
      lease:leases(
        id,
        tenant_user_id,
        listing:listings(property:properties(address, city))
      )
    `)
    .in("status", ["upcoming", "overdue"])
    .lte("due_date", upcomingIso);

  if (error) throw error;

  let reminded = 0;

  for (const row of scheduleRows || []) {
    if (row.reminded_at) continue;

    const lease = row.lease as {
      id?: string;
      tenant_user_id?: string;
      listing?: { property?: { address?: string; city?: string } };
    } | null;

    if (!lease?.tenant_user_id) continue;

    const address =
      lease.listing?.property?.address ||
      lease.listing?.property?.city ||
      "your rental";
    const amountLabel = new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: row.currency || "GHS",
    }).format((row.amount_minor || 0) / 100);

    const isOverdue = row.due_date < todayIso;
    const subject = isOverdue ? "Rent overdue" : "Rent payment due soon";
    const content = isOverdue
      ? `Rent of ${amountLabel} for ${address} was due on ${row.due_date}.`
      : `Rent of ${amountLabel} for ${address} is due on ${row.due_date}.`;

    await notifyUser(admin, {
      userId: lease.tenant_user_id,
      subject,
      content,
      notificationType: isOverdue ? "rent_overdue" : "rent_due",
      actionUrl: "/app/leases",
    });

    await admin
      .from("lease_rent_schedule")
      .update({
        reminded_at: new Date().toISOString(),
        reminder_type: isOverdue ? "overdue" : "upcoming",
        status: isOverdue ? "overdue" : row.status,
      })
      .eq("id", row.id);

    reminded += 1;
  }

  return { reminded };
}

async function withAutomationRun<T>(
  admin: ReturnType<typeof createAdminClient>,
  runType:
    | "saved_search_alerts"
    | "follow_up_reminders"
    | "stale_pipeline"
    | "viewing_reminders"
    | "rent_reminders"
    | "market_analytics_snapshot",
  executor: () => Promise<T>
) {
  const { data: run, error: runError } = await admin
    .from("automation_runs")
    .insert({
      run_type: runType,
      status: "running",
    })
    .select("*")
    .single();

  if (runError) {
    throw runError;
  }

  try {
    const summary = await executor();
    await admin
      .from("automation_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        summary,
      })
      .eq("id", run.id);
    return summary;
  } catch (error) {
    await admin
      .from("automation_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", run.id);
    throw error;
  }
}

async function runSavedSearchAlerts(admin: ReturnType<typeof createAdminClient>) {
  const { data: alerts, error: alertsError } = await admin
    .from("saved_search_alerts")
    .select("*")
    .eq("is_active", true);

  if (alertsError) throw alertsError;

  const { data: listings, error: listingsError } = await admin
    .from("listings")
    .select(
      `
      *,
      property:properties(*)
    `
    )
    .eq("status", "listed")
    .eq("visibility", "public");

  if (listingsError) throw listingsError;

  let checked = 0;
  let notified = 0;

  for (const alert of alerts || []) {
    if (!isDue(alert.last_checked_at, alert.frequency)) continue;
    checked += 1;

    const matchCount = (listings || []).filter((listing) => matchesSavedAlert(alert, listing)).length;
    const shouldNotify = matchCount > Number(alert.last_match_count || 0);
    const now = new Date().toISOString();

    if (shouldNotify) {
      const { data: recipient } = await admin
        .from("users")
        .select("email, phone")
        .eq("id", alert.user_id)
        .maybeSingle();

      await notifyUser(admin, {
        userId: alert.user_id,
        subject: `New matches for ${alert.title}`,
        content:
          matchCount === 1
            ? "A new property matched your saved search."
            : `${matchCount} properties now match your saved search.`,
        notificationType: "saved_search_match",
        actionUrl: "/search",
        email: recipient?.email || null,
        sendEmailCopy: true,
      });

      notified += 1;
    }

    await admin
      .from("saved_search_alerts")
      .update({
        last_checked_at: now,
        last_match_count: matchCount,
        last_notified_at: shouldNotify ? now : alert.last_notified_at || null,
      })
      .eq("id", alert.id);
  }

  return { checked, notified };
}

async function runFollowUpReminders(admin: ReturnType<typeof createAdminClient>) {
  const nowIso = new Date().toISOString();
  const { data: dealCases, error } = await admin
    .from("deal_cases")
    .select(
      `
      id,
      organization_id,
      assigned_to,
      next_follow_up_at,
      follow_up_reminded_at,
      listing:listings(id, property:properties(address, city)),
      user:users(full_name, email)
    `
    )
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", nowIso)
    .in("pipeline_stage", ["new_inquiry", "contacted", "qualified", "viewing_scheduled", "negotiation", "payment_pending"]);

  if (error) throw error;

  let reminded = 0;

  for (const dealCase of dealCases || []) {
    if (
      dealCase.follow_up_reminded_at &&
      new Date(dealCase.follow_up_reminded_at).getTime() >=
        new Date(dealCase.next_follow_up_at).getTime()
    ) {
      continue;
    }

    const { data: organization } = await admin
      .from("organizations")
      .select("owner_id, slug")
      .eq("id", dealCase.organization_id)
      .maybeSingle();

    const recipientId = dealCase.assigned_to || organization?.owner_id;
    if (!recipientId) continue;

    const { data: recipient } = await admin
      .from("users")
      .select("email")
      .eq("id", recipientId)
      .maybeSingle();

    await notifyUser(admin, {
      userId: recipientId,
      subject: "Lead follow-up is due",
      content: `${
        dealCase.user?.full_name || dealCase.user?.email || "A lead"
      } needs a follow-up for ${dealCase.listing?.property?.address || "their property request"}.`,
      notificationType: "lead_follow_up_due",
      actionUrl: organization?.slug ? `/workspace/${organization.slug}/leads` : "/workspace",
      email: recipient?.email || null,
      sendEmailCopy: true,
    });

    await admin
      .from("deal_cases")
      .update({ follow_up_reminded_at: nowIso })
      .eq("id", dealCase.id);

    reminded += 1;
  }

  return { reminded };
}

async function runStalePipelineNudges(admin: ReturnType<typeof createAdminClient>) {
  const staleThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();
  const { data: dealCases, error } = await admin
    .from("deal_cases")
    .select(
      `
      id,
      organization_id,
      assigned_to,
      pipeline_stage,
      updated_at,
      stale_nudged_at,
      listing:listings(id, property:properties(address)),
      user:users(full_name, email)
    `
    )
    .lt("updated_at", staleThreshold)
    .in("pipeline_stage", ["new_inquiry", "contacted", "qualified", "viewing_scheduled", "negotiation", "payment_pending"]);

  if (error) throw error;

  let nudged = 0;

  for (const dealCase of dealCases || []) {
    if (
      dealCase.stale_nudged_at &&
      new Date(dealCase.stale_nudged_at).getTime() >= new Date(dealCase.updated_at).getTime()
    ) {
      continue;
    }

    const { data: organization } = await admin
      .from("organizations")
      .select("owner_id, slug")
      .eq("id", dealCase.organization_id)
      .maybeSingle();

    const recipientId = dealCase.assigned_to || organization?.owner_id;
    if (!recipientId) continue;

    await notifyUser(admin, {
      userId: recipientId,
      subject: "Stale pipeline nudge",
      content: `${
        dealCase.user?.full_name || dealCase.user?.email || "A lead"
      } has been idle in ${dealCase.pipeline_stage.replace(/_/g, " ")} for more than 3 days.`,
      notificationType: "stale_pipeline_case",
      actionUrl: organization?.slug ? `/workspace/${organization.slug}/leads` : "/workspace",
    });

    await admin
      .from("deal_cases")
      .update({ stale_nudged_at: new Date().toISOString() })
      .eq("id", dealCase.id);

    nudged += 1;
  }

  return { nudged };
}

async function runViewingReminders(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  const endWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: viewings, error } = await admin
    .from("property_viewings")
    .select(
      `
      *,
      listing:listings(id, property:properties(address, city, region)),
      organization:organizations(slug),
      user:users(id, full_name, email, phone),
      assigned_member:users!property_viewings_assigned_to_fkey(id, full_name, email, phone)
    `
    )
    .in("status", ["confirmed", "rescheduled"])
    .gte("confirmed_datetime", now.toISOString())
    .lte("confirmed_datetime", endWindow.toISOString());

  if (error) throw error;

  let reminded = 0;

  for (const viewing of viewings || []) {
    if (
      viewing.reminder_sent_at &&
      new Date(viewing.reminder_sent_at).getTime() >=
        new Date(viewing.confirmed_datetime || viewing.requested_datetime).getTime()
    ) {
      continue;
    }

    const scheduleText = formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime);
    const actionUrl = viewing.organization?.slug
      ? `/workspace/${viewing.organization.slug}/leads`
      : "/app/viewings";
    const subject = "Viewing reminder";
    const content = `${
      viewing.listing?.property?.address || "Your property viewing"
    } is scheduled for ${scheduleText}.`;

    if (viewing.user_id) {
      await notifyUser(admin, {
        userId: viewing.user_id,
        subject,
        content,
        notificationType: "viewing_reminder",
        actionUrl: "/app/viewings",
        email: viewing.user?.email || viewing.contact_email || null,
        phone: viewing.contact_phone || viewing.user?.phone || null,
        sendEmailCopy: true,
        sendSmsCopy: true,
      });
    }

    if (viewing.assigned_to) {
      await notifyUser(admin, {
        userId: viewing.assigned_to,
        subject: "Assigned viewing reminder",
        content: `${viewing.user?.full_name || viewing.user?.email || "A prospect"} has a viewing at ${scheduleText}.`,
        notificationType: "assigned_viewing_reminder",
        actionUrl,
        email: viewing.assigned_member?.email || null,
        sendEmailCopy: true,
      });
    }

    await admin
      .from("property_viewings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", viewing.id);

    reminded += 1;
  }

  return { reminded };
}

async function runMarketAnalyticsSnapshots(admin: ReturnType<typeof createAdminClient>) {
  const { data: listings, error } = await admin
    .from("listings")
    .select(`
      price,
      created_at,
      listing_type,
      property:properties(category, city, region, neighborhood)
    `)
    .eq("status", "listed")
    .eq("visibility", "public");

  if (error) throw error;

  const grouped = new Map<
    string,
    {
      city: string;
      region: string;
      prices: number[];
      total: number;
      recent: number;
      listingType: string | null;
    }
  >();

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

  for (const listing of listings || []) {
    const property = listing.property as {
      city?: string | null;
      region?: string | null;
      neighborhood?: string | null;
    } | null;

    const city = property?.city?.trim() || property?.neighborhood?.trim();
    if (!city) continue;

    const region = property?.region?.trim() || "Ghana";
    const key = `${city}::${region}`;
    const bucket = grouped.get(key) || {
      city,
      region,
      prices: [],
      total: 0,
      recent: 0,
      listingType: listing.listing_type || null,
    };

    bucket.prices.push(Number(listing.price || 0));
    bucket.total += 1;
    if (new Date(listing.created_at).getTime() > thirtyDaysAgo) {
      bucket.recent += 1;
    }
    bucket.listingType = bucket.listingType || listing.listing_type || null;
    grouped.set(key, bucket);
  }

  const topLocations = Array.from(grouped.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  let analyticsInserted = 0;
  let trendsUpserted = 0;

  for (const location of topLocations) {
    const prices = location.prices.filter((price) => price > 0);
    if (!prices.length) continue;

    const avgPrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

    const recentPrices = (listings || [])
      .filter((listing) => {
        const property = listing.property as {
          city?: string | null;
          region?: string | null;
          neighborhood?: string | null;
        } | null;
        const city = property?.city?.trim() || property?.neighborhood?.trim();
        const region = property?.region?.trim() || "Ghana";
        return (
          city === location.city &&
          region === location.region &&
          new Date(listing.created_at).getTime() > thirtyDaysAgo
        );
      })
      .map((listing) => Number(listing.price || 0))
      .filter((price) => price > 0);

    const olderPrices = (listings || [])
      .filter((listing) => {
        const property = listing.property as {
          city?: string | null;
          region?: string | null;
          neighborhood?: string | null;
        } | null;
        const city = property?.city?.trim() || property?.neighborhood?.trim();
        const region = property?.region?.trim() || "Ghana";
        const createdAt = new Date(listing.created_at).getTime();
        return (
          city === location.city &&
          region === location.region &&
          createdAt <= thirtyDaysAgo &&
          createdAt > sixtyDaysAgo
        );
      })
      .map((listing) => Number(listing.price || 0))
      .filter((price) => price > 0);

    const recentAvg = recentPrices.length
      ? recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length
      : 0;
    const olderAvg = olderPrices.length
      ? olderPrices.reduce((sum, price) => sum + price, 0) / olderPrices.length
      : 0;
    const trend =
      olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 1000) / 10 : 0;
    const growthRate =
      location.total > 0 ? Math.round((location.recent / location.total) * 1000) / 10 : 0;

    const { error: analyticsError } = await admin.from("market_analytics").insert({
      period: "monthly",
      location: location.city,
      property_type: null,
      listing_type: location.listingType,
      avg_price: avgPrice,
      median_price: medianPrice,
      price_trend: trend,
      avg_listing_days: null,
      occupancy_rate: null,
      total_listings: location.total,
      new_listings: location.recent,
      sold_listings: 0,
    });

    if (analyticsError) {
      throw analyticsError;
    }

    analyticsInserted += 1;

    const { error: trendError } = await admin.from("location_trends").upsert(
      {
        city: location.city,
        region: location.region,
        growth_rate: growthRate,
        investment_score: Math.min(5, 2 + location.total * 0.2),
        safety_score: null,
        accessibility_score: null,
        demand_level:
          location.total >= 20
            ? "very_high"
            : location.total >= 10
              ? "high"
              : location.total >= 5
                ? "medium"
                : "low",
        trending_up: growthRate > 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city,region" }
    );

    if (trendError) {
      throw trendError;
    }

    trendsUpserted += 1;
  }

  return {
    locationsProcessed: topLocations.length,
    analyticsInserted,
    trendsUpserted,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    getAuthorizedAutomationKey(req);
    const admin = createAdminClient();

    const [
      savedSearchSummary,
      followUpSummary,
      staleSummary,
      viewingSummary,
      rentReminderSummary,
      marketAnalyticsSummary,
    ] = await Promise.all([
      withAutomationRun(admin, "saved_search_alerts", () => runSavedSearchAlerts(admin)),
      withAutomationRun(admin, "follow_up_reminders", () => runFollowUpReminders(admin)),
      withAutomationRun(admin, "stale_pipeline", () => runStalePipelineNudges(admin)),
      withAutomationRun(admin, "viewing_reminders", () => runViewingReminders(admin)),
      withAutomationRun(admin, "rent_reminders", () => runRentReminders(admin)),
      withAutomationRun(admin, "market_analytics_snapshot", () =>
        runMarketAnalyticsSnapshots(admin)
      ),
    ]);

    return jsonResponse(200, {
      success: true,
      savedSearchSummary,
      followUpSummary,
      staleSummary,
      viewingSummary,
      rentReminderSummary,
      marketAnalyticsSummary,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("automation-dispatcher error:", error);
    return jsonResponse(500, { error: "Automation dispatcher failed" });
  }
});
