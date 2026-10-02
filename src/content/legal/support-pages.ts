import { LEGAL_CONTACT, LEGAL_OPERATOR } from "../../lib/legal-config";
import { LEGAL_EFFECTIVE_DATE, LEGAL_LAST_UPDATED, PLATFORM_ROLE_STATEMENT, type LegalDocument } from "./types";

function page(
  doc: Omit<LegalDocument, "effectiveDate" | "lastUpdated" | "seoTitle" | "seoDescription"> &
    Partial<Pick<LegalDocument, "seoTitle" | "seoDescription">>,
): LegalDocument {
  return {
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    lastUpdated: LEGAL_LAST_UPDATED,
    seoTitle: doc.seoTitle ?? `BaytMiftah ${doc.title}`,
    seoDescription: doc.seoDescription ?? doc.description,
    ...doc,
  };
}

export const SUPPORT_PAGES: LegalDocument[] = [
  page({
    slug: "workspace-roles",
    title: "Workspace roles glossary",
    category: "support",
    description:
      "How BaytMiftah separates app account types, organization job roles, and resident or host marketplace metadata.",
    sections: [
      {
        heading: "App account type (sign-in metadata)",
        bullets: [
          "Consumer — default buyer/renter account; uses /app for saved homes, messages, leases, and wallet.",
          "Host — landlord or professional signup metadata; unlocks workspace entry paths after verification or invite.",
          "These labels live in auth user metadata and can lag behind organization membership until you accept an invite or enrollment is approved.",
        ],
      },
      {
        heading: "Organization owner vs property_owner",
        bullets: [
          "Owner / Founder (role: owner) — created the organization record; full workspace permissions and billing authority.",
          "Property owner (role: property_owner) — external owner linked to managed assets; read-focused access (listings, finance read) without team administration.",
          "Do not confuse organization owner with a resident who merely owns their home on the consumer app.",
        ],
      },
      {
        heading: "Residents, tenants, and hosts on listings",
        bullets: [
          "Resident / tenant — consumer-side occupancy; uses leases, payments, and maintenance in /app, not workspace team tools.",
          "Listing host metadata — who published or manages a public listing; may differ from the organization member operating the asset.",
        ],
      },
      {
        heading: "Inviting teammates",
        content:
          "Workspace → Team assigns job roles (agent, finance officer, property manager, etc.) with optional custom permissions. See your role home page after sign-in for the modules enabled for your department.",
      },
    ],
    relatedPolicies: ["help", "host-resources", "trust-verification"],
  }),
  page({
    slug: "help",
    title: "Help Centre",
    category: "support",
    description:
      "Guides for searching homes, managing leases, payments, and agency workspace tools on BaytMiftah.",
    sections: [
      {
        heading: "Search & discover",
        bullets: [
          "Browse all live listings on Home — no region is selected by default.",
          "Filter by Ghana region (16 regions), listing type (rent, sale, lease, short stay), price, beds, and verified status on Search.",
          "Compare up to four homes side-by-side from any listing card.",
          "Save homes and create search alerts from your buyer dashboard when signed in.",
        ],
      },
      {
        heading: "Buyers & renters",
        bullets: [
          "Request viewings, submit offers, and track applications from /app.",
          "Message hosts and agents from listing pages or /app/messages.",
          "Complete identity verification (KYC) before offers, wallet use, or smart-access features.",
          "Sign lease documents via secure links at /sign/:token when your agency sends them.",
          "Pay rent or booking charges through checkout — BaytMiftah does not hold customer funds.",
        ],
      },
      {
        heading: "For hosts & agencies",
        bullets: [
          "List properties from Workspace → New listing with jurisdiction compliance checks before publish.",
          "Manage leads, calendar, documents, leases, e-signatures, maintenance, and payments in your organisation workspace.",
          "Syndicate to MLS feeds, WhatsApp tenant bots, and bank reconciliation where enabled for your plan.",
          "See Host resources (/host-resources) and Host terms (/legal/host-terms) for onboarding guidance.",
        ],
      },
      {
        heading: "Trust & safety",
        content:
          "Listings may show verification badges and KYC-checked profiles. These reduce risk but do not guarantee title, condition, or user conduct. Report concerns via the complaint form or email support.",
      },
      {
        heading: "Contact support",
        content: `Email ${LEGAL_CONTACT.support}. Include your account email, listing or booking ID, and a clear description of the issue.`,
      },
    ],
    relatedPolicies: ["safety", "trust-verification", "payments", "refunds", "complaints"],
  }),
  page({
    slug: "cancellation",
    title: "Cancellation Options",
    category: "support",
    description:
      "How cancellations work for rentals, sales, leases, short stays, and BaytMiftah service fees.",
    relatedPolicies: ["refunds", "host-terms", "tenant-guest-rules", "payments"],
    sections: [
      {
        heading: "Underlying property transactions",
        content:
          "Cancellation rights for rent, purchase, or lease agreements depend on the contract between the parties — not BaytMiftah alone. Review your lease, offer, or booking confirmation and contact the host, agency, or owner directly for changes.",
      },
      {
        heading: "Short stays & bookings",
        content:
          "Short-stay bookings follow the cancellation rules shown at checkout and in the listing. Refund eligibility is determined by the host or agency policy and the applicable payment provider.",
      },
      {
        heading: "Viewings & applications",
        content:
          "You can cancel a viewing request from your dashboard before it is confirmed. Withdrawn offers and applications are handled in /app/applications.",
      },
      {
        heading: "BaytMiftah service fees",
        content:
          "Platform service fees, featured listing boosts, and subscription charges are separate from underlying rent or purchase payments. See the Refund & Cancellation Policy for fee refund rules.",
      },
      {
        heading: "Lease e-signatures",
        content:
          "If you received a signing link but need to decline or request changes, contact the sending agency before signing. Signed documents follow the e-signature policy and your lease terms.",
      },
    ],
  }),
  page({
    slug: "host-resources",
    title: "Host Resources",
    category: "support",
    description:
      "Onboarding guides for property owners, landlords, and agencies using BaytMiftah Workspace.",
    relatedPolicies: ["host-terms", "property-owner-terms", "agency-agent-terms", "marketplace-rules"],
    sections: [
      {
        heading: "Getting listed",
        bullets: [
          "Sign in and open Workspace → New listing (or use List your property in the site footer).",
          "Complete address, city, and region — Ghana (16 regions), Nigeria (37 states + FCT), and US (50 states + DC) are supported for compliance.",
          "Finish the compliance checklist and required disclosures before publishing live.",
          "Upload photos and amenities; listings pass quality review before appearing on search.",
        ],
      },
      {
        heading: "Workspace tools",
        bullets: [
          "Leads & CRM — track inquiries, tasks, and calendar viewings.",
          "Leases & e-signatures — send DocuSign or in-app signing links to tenants.",
          "Finance — rent collection, owner statements, bank reconciliation, and general ledger (plan-dependent).",
          "Operations — maintenance, inspections, smart property, and WhatsApp tenant communications.",
          "Integrations — MLS syndication, SMS, payment providers, and data import/export.",
        ],
      },
      {
        heading: "Verification & trust",
        content:
          "Agency KYC and listing verification badges help buyers trust your brand. Verification is point-in-time and does not replace independent due diligence by transacting parties.",
      },
      {
        heading: "Need help?",
        content: `Email ${LEGAL_CONTACT.support} for onboarding assistance or visit the Help Centre for buyer and host FAQs.`,
      },
    ],
  }),
];

export const COMPANY_PAGES: LegalDocument[] = [
  page({
    slug: "about",
    title: "About BaytMiftah",
    category: "company",
    description:
      "A digital real-estate marketplace and property operating platform for Africa and international markets.",
    sections: [
      {
        heading: "What BaytMiftah is",
        content:
          "BaytMiftah helps people and businesses discover, advertise, manage, and transact around property. Consumers search and compare homes, message agents, book viewings, sign leases, and pay rent. Agencies run listings, leads, finance, maintenance, and compliance from a unified workspace.",
      },
      {
        heading: "Markets we support",
        bullets: [
          "Ghana — full marketplace with 16-region search and local compliance rules.",
          "Nigeria, Kenya, South Africa, United States, United Kingdom, Canada, Australia, UAE, India, and EU markets — jurisdiction-aware listing and lease checklists in code.",
          "Multi-currency display and FX tools for cross-border portfolios.",
        ],
      },
      {
        heading: "What BaytMiftah is not",
        content: PLATFORM_ROLE_STATEMENT,
      },
      {
        heading: "Headquarters",
        content: `${LEGAL_OPERATOR.name}, ${LEGAL_OPERATOR.registeredAddress}.`,
      },
    ],
  }),
  page({
    slug: "careers",
    title: "Careers",
    category: "company",
    description: "Join the team building property technology from Ghana and beyond.",
    sections: [
      {
        heading: "Work with us",
        content:
          "We are growing engineering, product, operations, trust & safety, and partnerships teams in Accra and remotely across Africa. Roles include full-stack engineering, property operations, customer success, and compliance.",
      },
      {
        heading: "How to apply",
        content: "Send your CV, portfolio, and area of interest to careers@baytmiftah.com.",
      },
    ],
  }),
  page({
    slug: "contact",
    title: "Contact",
    category: "company",
    description: "Reach the BaytMiftah team.",
    sections: [
      {
        heading: "BaytMiftah",
        content: `${LEGAL_OPERATOR.name}, ${LEGAL_OPERATOR.registeredAddress}.`,
      },
      {
        heading: "General support",
        content: `Help Centre: /help · Email: ${LEGAL_CONTACT.support}`,
      },
      {
        heading: "Legal and privacy",
        content: `Legal: ${LEGAL_CONTACT.legal} · Privacy: ${LEGAL_CONTACT.privacy}`,
      },
      {
        heading: "Complaints and accessibility",
        content: `Complaints: ${LEGAL_CONTACT.complaints} · Accessibility: ${LEGAL_CONTACT.accessibility} · Online form: /complaint`,
      },
      {
        heading: "Hosting & partnerships",
        content:
          "Agencies and developers: start at /workspace or email support for onboarding. See Host resources at /host-resources.",
      },
    ],
  }),
];
