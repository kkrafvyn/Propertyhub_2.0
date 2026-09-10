export type EmailTemplateVariant = "transactional" | "marketing";

export type FeaturedListingBlock = {
  eyebrow?: string;
  sectionTitle?: string;
  imageUrl: string;
  badge?: string;
  title: string;
  location?: string;
  price?: string;
  beds?: string | number;
  baths?: string | number;
  sqft?: string | number;
  ctaUrl: string;
  ctaLabel?: string;
};

export type InsightsBlock = {
  title?: string;
  body: string;
  linkUrl?: string;
  linkLabel?: string;
  imageUrl?: string;
};

export type BaytMiftahEmailInput = {
  siteUrl?: string;
  variant?: EmailTemplateVariant;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  bodyHtml?: string;
  bodyText?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  featured?: FeaturedListingBlock | null;
  insights?: InsightsBlock | null;
  supportEmail?: string;
  supportPhone?: string;
  unsubscribeUrl?: string;
  year?: number;
  preheader?: string;
};

const BRAND_FOREST = "#0F2922";
const BRAND_MUTED = "#64748b";
const BRAND_BG = "#ecebe6";
const BRAND_BORDER = "#e7e5e4";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

export function resolveSiteUrl(siteUrl?: string) {
  const configured =
    siteUrl ||
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    "https://app.baytmiftah.com";
  return configured.replace(/\/+$/, "");
}

export function resolveEmailLogoUrl(siteUrl: string) {
  const override = Deno.env.get("EMAIL_LOGO_URL")?.trim();
  if (override) return override;
  return `${siteUrl}/brand/email-logo.svg`;
}

function defaultHeroImage(_siteUrl: string) {
  return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80";
}

function defaultInsightsImage(_siteUrl: string) {
  return "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80";
}

function renderEmailHeader(siteUrl: string, logoUrl: string) {
  return `
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;background:#ffffff;border-bottom:1px solid ${BRAND_BORDER};">
              <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
                <img src="${escapeHtml(logoUrl)}" width="300" height="64" alt="BaytMiftah" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;" />
              </a>
            </td>
          </tr>`;
}

function renderEmailFooter(input: {
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  unsubscribeUrl: string;
  year: number;
}) {
  const { siteUrl, supportEmail, supportPhone, unsubscribeUrl, year } = input;

  return `
          <tr>
            <td style="padding:32px;background:${BRAND_FOREST};text-align:center;">
              <p style="margin:0 0 6px;font-size:18px;letter-spacing:0.18em;color:#ffffff;font-family:Georgia,'Times New Roman',serif;">BAYTMIFTAH</p>
              <p style="margin:0 0 20px;font-size:10px;letter-spacing:0.24em;color:#9ca3af;">UNLOCKING PROPERTY OPPORTUNITIES</p>
              <p style="margin:0 0 8px;font-size:13px;color:#d1d5db;">✉ <a href="mailto:${escapeHtml(supportEmail)}" style="color:#d1d5db;text-decoration:none;">${escapeHtml(supportEmail)}</a></p>
              <p style="margin:0 0 20px;font-size:13px;color:#d1d5db;">☎ ${escapeHtml(supportPhone)}</p>
              <p style="margin:0 0 16px;font-size:11px;color:#9ca3af;">
                <a href="${siteUrl}" style="color:#ffffff;text-decoration:none;margin:0 8px;">Website</a>
                <a href="${siteUrl}/help" style="color:#ffffff;text-decoration:none;margin:0 8px;">Support</a>
                <a href="${siteUrl}/search" style="color:#ffffff;text-decoration:none;margin:0 8px;">Explore</a>
              </p>
              <p style="margin:0 0 10px;font-size:11px;color:#6b7280;">© ${year} BaytMiftah. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#6b7280;">
                <a href="${siteUrl}/privacy" style="color:#9ca3af;text-decoration:underline;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${siteUrl}/terms" style="color:#9ca3af;text-decoration:underline;">Terms of Service</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>`;
}

function renderCtaButton(ctaUrl: string, ctaLabel: string) {
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                <tr>
                  <td>
                    <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${BRAND_FOREST};color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;padding:14px 24px;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>`;
}

function renderTransactionalHero(title: string, subtitle?: string) {
  return `
          <tr>
            <td style="padding:32px 32px 28px;background:${BRAND_FOREST};">
              <h1 style="margin:0 0 ${subtitle ? "12px" : "0"};font-size:26px;line-height:1.25;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-weight:700;">${escapeHtml(title)}</h1>
              ${subtitle ? `<p style="margin:0;font-size:14px;line-height:1.7;color:#dbe4df;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(subtitle)}</p>` : ""}
            </td>
          </tr>`;
}

function renderFeaturedBlock(_siteUrl: string, featured: FeaturedListingBlock) {
  const eyebrow = featured.eyebrow || "FEATURED COLLECTION";
  const sectionTitle = featured.sectionTitle || "Curated for you";
  const badge = featured.badge || "NEW LISTING";
  const ctaLabel = featured.ctaLabel || "VIEW PROPERTY DETAILS →";

  const stats = [
    featured.beds != null ? `<td align="center" style="padding:12px 8px;font-size:12px;color:${BRAND_MUTED};">🛏 ${featured.beds} Beds</td>` : "",
    featured.baths != null ? `<td align="center" style="padding:12px 8px;font-size:12px;color:${BRAND_MUTED};">🛁 ${featured.baths} Baths</td>` : "",
    featured.sqft != null ? `<td align="center" style="padding:12px 8px;font-size:12px;color:${BRAND_MUTED};">📐 ${featured.sqft} sqft</td>` : "",
  ].filter(Boolean).join("");

  return `
          <tr>
            <td style="padding:0;background:#f3f4f1;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:36px 32px 12px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(eyebrow)}</p>
                    <h2 style="margin:0;font-size:28px;line-height:1.25;color:${BRAND_FOREST};font-family:Georgia,'Times New Roman',serif;font-weight:700;">${escapeHtml(sectionTitle)}</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 36px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid ${BRAND_BORDER};overflow:hidden;">
                      <tr>
                        <td style="padding:0;">
                          <img src="${escapeHtml(featured.imageUrl)}" alt="${escapeHtml(featured.title)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;" />
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 18px;">
                          <span style="display:inline-block;margin-top:-18px;background:${BRAND_FOREST};color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.14em;padding:8px 12px;">${escapeHtml(badge)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 24px 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td valign="top">
                                <h3 style="margin:0 0 6px;font-size:22px;color:${BRAND_FOREST};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(featured.title)}</h3>
                                ${featured.location ? `<p style="margin:0;font-size:13px;color:${BRAND_MUTED};">📍 ${escapeHtml(featured.location)}</p>` : ""}
                              </td>
                              ${featured.price ? `<td valign="top" align="right"><p style="margin:0 0 4px;font-size:10px;letter-spacing:0.16em;color:#94a3b8;">PRICE</p><p style="margin:0;font-size:24px;color:${BRAND_FOREST};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(featured.price)}</p></td>` : ""}
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${stats ? `<tr><td style="padding:0 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${BRAND_BORDER};border-bottom:1px solid ${BRAND_BORDER};"><tr>${stats}</tr></table></td></tr>` : ""}
                      <tr>
                        <td style="padding:20px 24px 24px;">
                          <a href="${escapeHtml(featured.ctaUrl)}" style="display:block;background:${BRAND_FOREST};color:#ffffff;text-decoration:none;text-align:center;font-size:12px;font-weight:700;letter-spacing:0.12em;padding:16px 20px;">${escapeHtml(ctaLabel)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function renderInsightsBlock(siteUrl: string, insights: InsightsBlock) {
  const title = insights.title || "Market Insights";
  const linkLabel = insights.linkLabel || "READ THE FULL REPORT";
  const imageUrl = insights.imageUrl || defaultInsightsImage(siteUrl);

  return `
          <tr>
            <td style="padding:36px 32px;background:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="top" style="padding-right:16px;">
                    <h2 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:${BRAND_FOREST};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(title)}</h2>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;font-family:Arial,Helvetica,sans-serif;">${nl2br(insights.body)}</p>
                    ${insights.linkUrl ? `<a href="${escapeHtml(insights.linkUrl)}" style="font-size:11px;font-weight:700;letter-spacing:0.16em;color:${BRAND_FOREST};text-decoration:underline;">${escapeHtml(linkLabel)}</a>` : ""}
                  </td>
                  <td valign="top" width="180" style="width:180px;">
                    <img src="${escapeHtml(imageUrl)}" alt="" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:8px solid #ffffff;box-shadow:0 8px 24px rgba(15,41,34,0.12);" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function renderMarketingHero(siteUrl: string, heroTitle: string, heroSubtitle: string, heroImage: string) {
  return `
          <tr>
            <td style="padding:0;background:${BRAND_FOREST};">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:280px;">
                <v:fill type="frame" src="${heroImage}" color="${BRAND_FOREST}" />
                <v:textbox inset="0,0,0,0">
              <![endif]-->
              <div style="background-image:url('${heroImage}');background-size:cover;background-position:center center;background-color:${BRAND_FOREST};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:180px 32px 32px;background:linear-gradient(180deg, rgba(15,41,34,0.05) 0%, rgba(15,41,34,0.88) 72%, rgba(15,41,34,0.96) 100%);">
                      <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-weight:700;">${escapeHtml(heroTitle)}</h1>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#dbe4df;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(heroSubtitle)}</p>
                    </td>
                  </tr>
                </table>
              </div>
              <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
            </td>
          </tr>`;
}

function wrapEmailDocument(input: {
  preheader?: string;
  logoUrl: string;
  bodyRows: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  unsubscribeUrl: string;
  year: number;
}) {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>BaytMiftah</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:Arial,Helvetica,sans-serif;color:${BRAND_FOREST};">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND_BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;overflow:hidden;border:1px solid ${BRAND_BORDER};">
          ${renderEmailHeader(input.siteUrl, input.logoUrl)}
          ${input.bodyRows}
          ${renderEmailFooter({
            siteUrl: input.siteUrl,
            supportEmail: input.supportEmail,
            supportPhone: input.supportPhone,
            unsubscribeUrl: input.unsubscribeUrl,
            year: input.year,
          })}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderBaytMiftahEmail(input: BaytMiftahEmailInput) {
  const siteUrl = resolveSiteUrl(input.siteUrl);
  const logoUrl = resolveEmailLogoUrl(siteUrl);
  const variant =
    input.variant ||
    (input.featured || input.insights || input.heroImageUrl ? "marketing" : "transactional");

  const heroTitle = input.heroTitle || "Unlocking Exclusive Property Opportunities";
  const heroSubtitle =
    input.heroSubtitle ||
    "Experience curated homes, rentals, and short stays across Ghana and beyond with BaytMiftah.";
  const heroImage = input.heroImageUrl || defaultHeroImage(siteUrl);
  const bodyHtml =
    input.bodyHtml ||
    (input.bodyText
      ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;font-family:Arial,Helvetica,sans-serif;">${nl2br(input.bodyText)}</p>`
      : "");
  const ctaUrl = input.ctaUrl || siteUrl;
  const ctaLabel = input.ctaLabel || "OPEN BAYTMIFTAH";
  const supportEmail = input.supportEmail || Deno.env.get("NOTIFICATION_EMAIL_REPLY_TO") || "support@baytmiftah.com";
  const supportPhone = input.supportPhone || "+233 30 000 0000";
  const unsubscribeUrl = input.unsubscribeUrl || `${siteUrl}/app/settings`;
  const year = input.year || new Date().getFullYear();

  if (variant === "transactional") {
    const bodyRows = `
          ${renderTransactionalHero(heroTitle, input.heroSubtitle)}
          <tr>
            <td style="padding:32px;background:#ffffff;">
              ${bodyHtml}
              ${renderCtaButton(ctaUrl, ctaLabel)}
            </td>
          </tr>`;

    return wrapEmailDocument({
      preheader: input.preheader || input.bodyText || heroTitle,
      logoUrl,
      bodyRows,
      siteUrl,
      supportEmail,
      supportPhone,
      unsubscribeUrl,
      year,
    });
  }

  const featuredBlock = input.featured ? renderFeaturedBlock(siteUrl, input.featured) : "";
  const insightsBlock = input.insights ? renderInsightsBlock(siteUrl, input.insights) : "";
  const showMainBody = Boolean(bodyHtml && !input.featured);

  const bodyRows = `
          ${renderMarketingHero(siteUrl, heroTitle, heroSubtitle, heroImage)}
          ${featuredBlock}
          ${showMainBody ? `<tr><td style="padding:32px;background:#ffffff;">${bodyHtml}${renderCtaButton(ctaUrl, ctaLabel)}</td></tr>` : ""}
          ${insightsBlock}`;

  return wrapEmailDocument({
    preheader: input.preheader || heroSubtitle,
    logoUrl,
    bodyRows,
    siteUrl,
    supportEmail,
    supportPhone,
    unsubscribeUrl,
    year,
  });
}

export function renderTransactionalEmail(input: {
  siteUrl?: string;
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  actionUrl?: string | null;
  preheader?: string;
}) {
  const siteUrl = resolveSiteUrl(input.siteUrl);
  const ctaUrl = input.ctaUrl || (input.actionUrl?.startsWith("http") ? input.actionUrl : `${siteUrl}${input.actionUrl || ""}`);
  const ctaLabel = input.ctaLabel || "VIEW IN BAYTMIFTAH";

  return renderBaytMiftahEmail({
    siteUrl,
    variant: "transactional",
    heroTitle: input.title,
    heroSubtitle: undefined,
    bodyText: input.body,
    ctaUrl,
    ctaLabel,
    preheader: input.preheader || input.body.slice(0, 120),
  });
}

export function buildTransactionalEmail(input: {
  siteUrl?: string;
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  actionUrl?: string | null;
  preheader?: string;
}) {
  const siteUrl = resolveSiteUrl(input.siteUrl);
  const ctaUrl = input.ctaUrl || (input.actionUrl?.startsWith("http") ? input.actionUrl : `${siteUrl}${input.actionUrl || ""}`);
  const ctaLabel = input.ctaLabel || "VIEW IN BAYTMIFTAH";

  return {
    html: renderTransactionalEmail(input),
    text: `${input.title}\n\n${input.body}\n\n${ctaLabel}: ${ctaUrl}`,
  };
}
