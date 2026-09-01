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
    slug: "help",
    title: "Help Centre",
    category: "support",
    description: "Get help with BaytMiftah search, bookings, payments, and workspace tools.",
    sections: [
      {
        heading: "Getting started",
        bullets: [
          "Create an account and complete your profile.",
          "Search by location, listing type, and budget on Explore.",
          "Save listings and set alerts from your dashboard.",
        ],
      },
      {
        heading: "For hosts and agencies",
        bullets: [
          "List properties from Workspace.",
          "Manage leads, documents, and workflow tools in your organisation dashboard.",
          "Contact support for verification and onboarding help.",
        ],
      },
      {
        heading: "Contact support",
        content: `Email ${LEGAL_CONTACT.support}. Include your account email and a description of the issue.`,
      },
    ],
  }),
  page({
    slug: "cancellation",
    title: "Cancellation Options",
    category: "support",
    description: "Cancellation rights depend on the underlying transaction and the applicable transaction party.",
    relatedPolicies: ["refunds", "host-terms", "payments"],
    sections: [
      {
        heading: "Transaction cancellations",
        content:
          "Cancellation rights depend on the underlying transaction. See the Refund & Cancellation Policy for the distinction between underlying transactions, BaytMiftah service fees, and third-party payment-provider refunds.",
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
      "A digital real-estate marketplace and technology platform for discovering, advertising, managing, and transacting around property.",
    sections: [
      {
        heading: "What BaytMiftah is",
        content:
          "BaytMiftah is a digital real-estate marketplace and technology platform that helps people and businesses discover, advertise, communicate about, manage, and transact around property and property-related services. BaytMiftah operates as a neutral technology marketplace. Unless expressly stated otherwise in a separate agreement, BaytMiftah is not a party to the underlying agreement between users.",
      },
      {
        heading: "What BaytMiftah is not",
        content: PLATFORM_ROLE_STATEMENT,
      },
    ],
  }),
  page({
    slug: "careers",
    title: "Careers",
    category: "company",
    description: "Join the team building property technology in Ghana.",
    sections: [
      {
        heading: "Work with us",
        content:
          "We are growing engineering, product, operations, and partnerships teams in Accra and remotely. Send your CV and area of interest to careers@baytmiftah.com.",
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
        heading: "General",
        content: `Support: ${LEGAL_CONTACT.support}`,
      },
      {
        heading: "Legal and privacy",
        content: `Legal: ${LEGAL_CONTACT.legal} · Privacy: ${LEGAL_CONTACT.privacy}`,
      },
      {
        heading: "Complaints and accessibility",
        content: `Complaints: ${LEGAL_CONTACT.complaints} · Accessibility: ${LEGAL_CONTACT.accessibility}`,
      },
    ],
  }),
];
