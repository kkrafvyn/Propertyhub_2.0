export type LegalSection = {
  title: string;
  body?: string;
  bullets?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  category: "legal" | "support" | "company";
  sections: LegalSection[];
  relatedSlugs?: string[];
};

import { mergeLegalDocuments } from "./legal-documents-extended";
import { COOKIE_DEFINITIONS } from "../../../lib/legal-config";

const LAST_UPDATED = "July 30, 2026";
const GOVERNING_LAW = "Republic of Ghana";
const CONTACT_EMAIL = "legal@baytmiftah.com";
const PRIVACY_EMAIL = "privacy@baytmiftah.com";
const SUPPORT_EMAIL = "support@baytmiftah.com";

export const LEGAL_LAST_UPDATED = LAST_UPDATED;

const BASE_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    summary:
      "BaytMiftah is a digital marketplace and real estate operating platform. These terms govern your use of our services.",
    category: "legal",
    relatedSlugs: ["marketplace-rules", "privacy", "payment-escrow", "dispute-resolution"],
    sections: [
      {
        title: "Introduction",
        body: "BaytMiftah (\"BaytMiftah\", \"we\", \"us\", \"our\") operates an online marketplace and real estate operating system that connects consumers, property owners, hosts, tenants, guests, agencies, and agents. By accessing or using BaytMiftah, you agree to these Terms of Service. If you do not agree, do not use the platform.",
      },
      {
        title: "Eligibility",
        bullets: [
          "You must be at least 18 years old (or the age of majority in your jurisdiction).",
          "You must have legal capacity to enter binding contracts.",
          "You must provide accurate, current registration information.",
          "One personal account per individual unless we approve a business or agency account.",
          "Agency and professional accounts must hold valid licences where required by law.",
        ],
      },
      {
        title: "Account responsibilities",
        bullets: [
          "You are responsible for safeguarding passwords and account credentials.",
          "You are responsible for all activity under your account.",
          "You must keep profile, contact, and verification information accurate.",
          "Notify us immediately of unauthorised access at support@baytmiftah.com.",
        ],
      },
      {
        title: "Platform role",
        body: "BaytMiftah provides technology services that facilitate discovery, communication, bookings, leases, payments, documents, and workspace tools. Unless we explicitly state otherwise in writing, BaytMiftah:",
        bullets: [
          "Does not own listed properties.",
          "Is not a party to rental, sale, lease, or short-stay contracts between users.",
          "Does not guarantee the accuracy of user-supplied information.",
          "Acts as an intermediary and technology provider, not as estate agent, broker, landlord, or seller of record.",
        ],
      },
      {
        title: "Listings",
        body: "Owners, hosts, and authorised agents warrant that:",
        bullets: [
          "They have authority to list the property.",
          "Listing information, photos, pricing, and availability are accurate and not misleading.",
          "Listings comply with applicable law, licensing, and community standards.",
          "Featured or promoted placement may require payment and is subject to separate fees.",
        ],
      },
      {
        title: "Transactions",
        bullets: [
          "Contracts for rent, purchase, lease, or short stays are between the relevant parties.",
          "BaytMiftah may facilitate messaging, scheduling, documents, and payments where enabled.",
          "Escrow and wallet features do not make BaytMiftah the owner or seller of a property.",
          "Users remain responsible for due diligence, inspections, and independent legal advice.",
        ],
      },
      {
        title: "Payments, wallets & escrow",
        body: "Where payment features are enabled, additional Payment & Escrow Terms apply. In summary:",
        bullets: [
          "Payments may be processed by licensed third-party providers (e.g. Paystack, Stripe).",
          "Wallets and escrow holds are subject to release conditions, disputes, and applicable law.",
          "Fees, taxes, refunds, and currency conversion are disclosed at checkout where applicable.",
          "BaytMiftah may freeze funds where required by law, court order, or fraud investigation.",
        ],
      },
      {
        title: "User conduct",
        body: "You must not:",
        bullets: [
          "Post fraudulent, misleading, or illegal listings.",
          "Engage in money laundering, sanctions evasion, or other financial crime.",
          "Harass, threaten, or discriminate against other users.",
          "Spam, scrape, or attempt to circumvent platform security.",
          "Circumvent agreed platform fees where legally enforceable.",
          "Use the platform for any unlawful purpose.",
        ],
      },
      {
        title: "Intellectual property",
        bullets: [
          "BaytMiftah owns its brand, software, logos, and platform design.",
          "You retain ownership of content you submit but grant BaytMiftah a licence to host, display, and promote listings and related materials on the platform.",
          "Do not use BaytMiftah marks without written permission.",
        ],
      },
      {
        title: "Disclaimer of warranties",
        body: "To the fullest extent permitted by law, BaytMiftah provides the platform \"as is\" and \"as available\" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, or non-infringement.",
      },
      {
        title: "Limitation of liability",
        body: "To the extent permitted by law, BaytMiftah is not liable for:",
        bullets: [
          "False or incomplete information supplied by users.",
          "Property condition, title defects, or misrepresentations by listing parties.",
          "Contract breaches between users.",
          "Financial losses caused solely by another user's acts or omissions.",
          "Acts or omissions of third-party payment, identity, or service providers.",
          "Indirect, incidental, special, or consequential damages.",
        ],
      },
      {
        title: "Indemnification",
        body: "You agree to indemnify and hold BaytMiftah harmless from claims arising from your listings, conduct, breach of these terms, violation of law, or disputes with other users, except where caused by our gross negligence or wilful misconduct as determined by a court of competent jurisdiction.",
      },
      {
        title: "Suspension & termination",
        bullets: [
          "We may suspend or terminate accounts for fraud, abuse, or legal violations.",
          "We may remove or hide listings that breach these terms or applicable law.",
          "We may freeze wallets or escrow where legally required or during investigations.",
          "We will cooperate with law enforcement and regulators as required by law.",
        ],
      },
      {
        title: "Force majeure",
        body: "BaytMiftah is not liable for delays or failures caused by events beyond reasonable control, including natural disasters, government actions, network outages, or third-party service failures.",
      },
      {
        title: "Electronic signatures & communications",
        body: "You consent to receive notices electronically and to use electronic signatures where enabled through our document centre, subject to applicable e-signature law.",
      },
      {
        title: "Governing law & disputes",
        body: `These terms are governed by the laws of the ${GOVERNING_LAW}. Courts in Accra, Ghana have non-exclusive jurisdiction unless mandatory consumer law provides otherwise. See our Dispute Resolution Policy for mediation steps before litigation where applicable.`,
      },
      {
        title: "Changes",
        body: "We may update these terms. Material changes will be posted on the platform with an updated date. Continued use after changes constitutes acceptance where permitted by law.",
      },
      {
        title: "Contact",
        body: `Questions: ${CONTACT_EMAIL} · ${SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How BaytMiftah collects, uses, stores, and protects personal data.",
    category: "legal",
    relatedSlugs: ["cookies", "terms", "trust-verification"],
    sections: [
      {
        title: "Introduction",
        body: "BaytMiftah respects your privacy. This policy explains how we process personal data when you use our website, mobile apps, and related services in Ghana and other markets we serve.",
      },
      {
        title: "Data we collect",
        bullets: [
          "Account data: name, email, phone, profile photo, role, preferences.",
          "Listing & transaction data: properties, bookings, leases, offers, messages, documents.",
          "Payment data: processed by licensed providers; we do not store full card numbers on our servers.",
          "Verification data: KYC documents, agency licences where submitted.",
          "Device & usage data: IP address, browser, app version, analytics, cookies.",
          "Communications: support tickets, notifications, marketing preferences.",
        ],
      },
      {
        title: "How we use data",
        bullets: [
          "Operate the marketplace, search, bookings, and workspace tools.",
          "Process payments, escrow, refunds, and fraud prevention.",
          "Verify listings, agencies, and identity where enabled.",
          "Send service notifications and, with consent, marketing.",
          "Improve products, security, and compliance.",
          "Comply with legal obligations and respond to lawful requests.",
        ],
      },
      {
        title: "Legal bases (where applicable)",
        body: "Depending on jurisdiction, we rely on contract performance, legitimate interests, consent, and legal obligation — including Ghana's Data Protection Act, 2012 (Act 843) and, where applicable, GDPR for users in the EEA.",
      },
      {
        title: "Sharing",
        bullets: [
          "Payment processors (Paystack, Stripe, and other licensed PSPs).",
          "Identity, signing, and document partners when you opt in.",
          "Cloud infrastructure (Supabase and hosting providers) under contract.",
          "Agencies and counterparties when you initiate a transaction.",
          "Regulators and law enforcement when legally required.",
          "We do not sell personal data.",
        ],
      },
      {
        title: "International transfers",
        body: "Data may be processed in Ghana, the EU, the US, or other countries where our providers operate. We use appropriate safeguards where required by law.",
      },
      {
        title: "Security",
        body: "We use encryption in transit, row-level database security, access controls, and server-side secret management. No system is 100% secure — use a strong password and protect your devices.",
      },
      {
        title: "Retention",
        body: "We retain data while your account is active and as needed for legal, tax, audit, and dispute purposes, then delete or anonymise unless law requires longer retention.",
      },
      {
        title: "Your rights",
        bullets: [
          "Access, correct, or delete your data (subject to legal exceptions).",
          "Object to or restrict certain processing where applicable.",
          "Withdraw marketing consent at any time.",
          "Lodge a complaint with Ghana's Data Protection Commission or your local authority.",
        ],
      },
      {
        title: "Children",
        body: "BaytMiftah is not directed at children under 18. We do not knowingly collect data from minors.",
      },
      {
        title: "Contact",
        body: `Data protection enquiries: ${PRIVACY_EMAIL} · Accra, Ghana`,
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "How BaytMiftah uses cookies and similar technologies.",
    category: "legal",
    relatedSlugs: ["privacy"],
    sections: [
      {
        title: "What are cookies?",
        body: "Cookies are small text files stored on your device. We also use local storage and similar technologies for session management and preferences.",
      },
      {
        title: "Types we use",
        bullets: [
          "Essential: authentication, security, load balancing — required for the site to work.",
          "Functional: language, market, and UI preferences.",
          "Analytics: aggregated usage to improve performance (where enabled).",
          "Marketing: only with consent where required by law.",
        ],
      },
      {
        title: "Managing cookies",
        body: "You can control cookies through browser settings. Disabling essential cookies may limit platform functionality.",
      },
    ],
  },
  {
    slug: "payment-escrow",
    title: "Payment & Escrow Terms",
    summary: "Rules for wallets, escrow holds, releases, refunds, and fees.",
    category: "legal",
    relatedSlugs: ["terms", "dispute-resolution", "marketplace-rules"],
    sections: [
      {
        title: "Overview",
        body: "These terms supplement the Terms of Service when you use BaytMiftah wallets, escrow, or integrated checkout. BaytMiftah facilitates payments but is not a bank. Funds are held by licensed payment partners where applicable.",
      },
      {
        title: "When funds are held",
        bullets: [
          "Deposits for purchases or rentals pending milestone completion.",
          "Short-stay booking payments until check-in or release rules are met.",
          "Workspace payouts pending verification or dispute windows.",
        ],
      },
      {
        title: "Release conditions",
        body: "Escrow releases when agreed milestones are confirmed by the parties, automatic rules expire, or BaytMiftah resolves a dispute according to our Dispute Resolution Policy and applicable law.",
      },
      {
        title: "Refunds & chargebacks",
        bullets: [
          "Refunds follow the cancellation policy shown at booking or checkout.",
          "Chargebacks may result in account suspension pending investigation.",
          "Processing times depend on payment partners and banks.",
        ],
      },
      {
        title: "Fees & taxes",
        body: "Platform fees, payment processing fees, and applicable taxes are disclosed before you confirm a transaction. You are responsible for taxes required by law in your jurisdiction.",
      },
      {
        title: "Currency",
        body: "Default display currency is GHS unless otherwise shown. Conversion rates may apply for cross-border payments.",
      },
    ],
  },
  {
    slug: "marketplace-rules",
    title: "Marketplace Rules",
    summary: "What BaytMiftah does and does not guarantee as a neutral marketplace.",
    category: "legal",
    relatedSlugs: ["terms", "trust-verification"],
    sections: [
      {
        title: "Our role",
        body: "BaytMiftah is a technology marketplace connecting property participants. We aim to be a neutral intermediary while enforcing these rules and applicable law.",
      },
      {
        title: "BaytMiftah does not",
        bullets: [
          "Inspect every property in person.",
          "Guarantee every listing is accurate or available.",
          "Guarantee legal ownership or clear title.",
          "Guarantee tenant, guest, or buyer suitability.",
          "Guarantee payment outside platform-controlled processes.",
          "Guarantee investment returns, rental yields, or property appreciation.",
        ],
      },
      {
        title: "User responsibilities",
        bullets: [
          "Conduct independent due diligence before transacting.",
          "Use in-platform messaging and payments where offered for protection.",
          "Report suspected fraud immediately.",
          "Comply with fair housing and anti-discrimination laws.",
        ],
      },
    ],
  },
  {
    slug: "host-terms",
    title: "Host Terms (Short Stay)",
    summary: "Additional terms for short-stay hosts on BaytMiftah.",
    category: "legal",
    relatedSlugs: ["tenant-guest-rules", "payment-escrow", "cancellation"],
    sections: [
      {
        title: "Eligibility",
        body: "Hosts must own the property or have written authority to offer short stays, and comply with local registration, tax, and safety requirements.",
      },
      {
        title: "Listing standards",
        bullets: [
          "Accurate photos, amenities, house rules, and pricing.",
          "Updated calendars and instant-book settings.",
          "Disclosure of shared spaces, cameras (where legal), and access instructions.",
        ],
      },
      {
        title: "Safety & compliance",
        bullets: [
          "Maintain safe premises and required safety equipment.",
          "Respond to guest messages within a reasonable time.",
          "Honor confirmed bookings except as allowed by cancellation policy.",
          "Remit taxes and levies required by law.",
        ],
      },
    ],
  },
  {
    slug: "owner-terms",
    title: "Property Owner Terms",
    summary: "Terms for owners listing properties for rent, sale, or lease.",
    category: "legal",
    relatedSlugs: ["agency-terms", "marketplace-rules"],
    sections: [
      {
        title: "Authority",
        body: "You represent that you have legal authority to rent, sell, or lease the property and that no agreement with a third party prevents the listing.",
      },
      {
        title: "Disclosures",
        bullets: [
          "Material defects, encumbrances, or disputes affecting the property where required by law.",
          "Accurate title, tenure, and pricing information.",
          "Valid occupancy certificates or permits where applicable.",
        ],
      },
      {
        title: "Agreements",
        body: "You agree to honor confirmed viewings, offers, and leases facilitated through the platform, subject to applicable cooling-off or consumer rights.",
      },
    ],
  },
  {
    slug: "agency-terms",
    title: "Agency & Agent Terms",
    summary: "Terms for real estate agencies and agents using BaytMiftah workspace.",
    category: "legal",
    relatedSlugs: ["owner-terms", "trust-verification"],
    sections: [
      {
        title: "Licensing",
        body: "Agencies and agents must hold valid licences where required (e.g. Ghana Real Estate Authority requirements) and provide accurate licence details for verification.",
      },
      {
        title: "Responsibilities",
        bullets: [
          "Ensure agents act within scope of authority.",
          "Maintain accurate listings and client mandates.",
          "Handle commissions, disclosures, and taxes as required by law.",
          "Respond to leads and messages professionally and promptly.",
        ],
      },
      {
        title: "Workspace use",
        body: "CRM, automation, and team features are provided as tools. Agencies remain responsible for client relationships and regulatory compliance.",
      },
    ],
  },
  {
    slug: "tenant-guest-rules",
    title: "Tenant & Guest Rules",
    summary: "Conduct expectations for renters, tenants, and short-stay guests.",
    category: "legal",
    relatedSlugs: ["host-terms", "acceptable-use"],
    sections: [
      {
        title: "General conduct",
        bullets: [
          "Pay rent, deposits, and fees on time as agreed.",
          "Respect property rules, neighbours, and house rules.",
          "Avoid damage, illegal activity, and unauthorised subletting.",
          "Leave short-stay properties in agreed condition.",
        ],
      },
      {
        title: "Applications & bookings",
        body: "Providing false income, identity, or reference information may result in immediate cancellation and account suspension.",
      },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    summary: "Prohibited uses of the BaytMiftah platform.",
    category: "legal",
    relatedSlugs: ["terms", "marketplace-rules"],
    sections: [
      {
        title: "Prohibited activity",
        bullets: [
          "Fraud, phishing, or impersonation.",
          "Malware, scraping at scale, or API abuse.",
          "Hate speech, harassment, or unlawful discrimination.",
          "Listing stolen, encumbered, or non-existent properties.",
          "Circumventing security, RLS, or payment controls.",
        ],
      },
      {
        title: "Enforcement",
        body: "Violations may result in content removal, account suspension, wallet freezes, and referral to authorities.",
      },
    ],
  },
  {
    slug: "trust-verification",
    title: "Trust & Verification Policy",
    summary: "How verification works and what it does not guarantee.",
    category: "legal",
    relatedSlugs: ["marketplace-rules", "agency-terms"],
    sections: [
      {
        title: "Purpose",
        body: "Verification badges indicate that information was reviewed according to our procedures at a point in time. Verification is not a guarantee of future conduct, property condition, or legal title.",
      },
      {
        title: "Types",
        bullets: [
          "Platform reviewed — internal checks on submitted agency or listing information.",
          "ID checked — KYC identity review for high-value actions.",
          "Listing quality score — completeness score only, not safety or title certification.",
          "Licensed payment partner — payments processed by third parties such as Paystack.",
        ],
      },
      {
        title: "UI label glossary",
        bullets: [
          "Platform reviewed: workspace/agency information was reviewed; not a government licence or title guarantee.",
          "ID checked: identity documents reviewed at a point in time.",
          "Payment hold: funds may be held per Payment & Escrow Terms; BaytMiftah is not a bank.",
          "Listing quality score: internal completeness metric only.",
        ],
      },
      {
        title: "Your due diligence",
        body: "Users should still inspect properties, review documents, and seek independent legal and financial advice before committing to transactions.",
      },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright & IP Policy",
    summary: "Reporting intellectual property infringement on BaytMiftah.",
    category: "legal",
    relatedSlugs: ["terms", "acceptable-use"],
    sections: [
      {
        title: "Reporting infringement",
        body: `If you believe content on BaytMiftah infringes your copyright or trademark, email ${CONTACT_EMAIL} with: (1) your contact details, (2) description of the work, (3) URL of the infringing content, (4) a statement of good faith, and (5) your signature.`,
      },
      {
        title: "Counter-notice",
        body: "If your content was removed in error, you may submit a counter-notice with the information required by applicable law.",
      },
      {
        title: "Repeat infringers",
        body: "We may terminate accounts of repeat infringers.",
      },
    ],
  },
  {
    slug: "dispute-resolution",
    title: "Dispute Resolution Policy",
    summary: "How disputes between users are handled on BaytMiftah.",
    category: "legal",
    relatedSlugs: ["payment-escrow", "terms"],
    sections: [
      {
        title: "Primary responsibility",
        body: "Disputes are primarily between the relevant parties: buyer and seller, tenant and owner, guest and host, agency and client.",
      },
      {
        title: "BaytMiftah may",
        bullets: [
          "Review evidence submitted through the platform.",
          "Freeze escrow pending resolution where payment features apply.",
          "Suspend accounts or remove listings that violate policy.",
          "Offer mediation assistance where available.",
          "Comply with lawful court orders and regulator requests.",
        ],
      },
      {
        title: "Escalation",
        body: "If parties cannot resolve a dispute, they may pursue remedies under their contract and applicable law in Ghana or the jurisdiction governing the transaction.",
      },
    ],
  },
];

export const LEGAL_DOCUMENTS: LegalDocument[] = mergeLegalDocuments(
  BASE_LEGAL_DOCUMENTS.map((doc) => {
    if (doc.slug !== "cookies") return doc;
    return {
      ...doc,
      sections: [
        ...doc.sections,
        {
          title: "Cookie register",
          bullets: COOKIE_DEFINITIONS.map(
            (c) => `${c.name} (${c.category}) — ${c.purpose}. Duration: ${c.duration}. Provider: ${c.provider}.`,
          ),
        },
      ],
    };
  }),
);

export const SUPPORT_PAGES: LegalDocument[] = [
  {
    slug: "help",
    title: "Help Centre",
    summary: "Get help with BaytMiftah search, bookings, payments, and workspace.",
    category: "support",
    sections: [
      {
        title: "Getting started",
        bullets: [
          "Create an account and complete your profile.",
          "Search by location, listing type, and budget on the Explore page.",
          "Save listings and set alerts from your dashboard.",
        ],
      },
      {
        title: "For hosts & agencies",
        bullets: [
          "List properties from Workspace → New listing.",
          "Manage leads, documents, and payouts in your organisation dashboard.",
          "Contact support for verification and onboarding help.",
        ],
      },
      {
        title: "Contact support",
        body: `Email ${SUPPORT_EMAIL} · Include your account email and a description of the issue. We aim to respond within 2 business days.`,
      },
    ],
  },
  {
    slug: "safety",
    title: "Safety",
    summary: "Safety tips and how BaytMiftah helps protect users.",
    category: "support",
    sections: [
      {
        title: "On the platform",
        bullets: [
          "Use in-app messaging — avoid sharing payment details off-platform.",
          "Verify agency badges and read reviews where available.",
          "Report suspicious listings via /complaint or support@baytmiftah.com.",
        ],
      },
      {
        title: "In person",
        bullets: [
          "Meet in public places for first viewings when possible.",
          "Bring someone you trust to property visits.",
          "Never wire money outside verified checkout flows.",
        ],
      },
      {
        title: "Emergencies",
        body: "Contact local emergency services first. Then notify BaytMiftah support so we can take appropriate platform action.",
      },
    ],
  },
  {
    slug: "cancellation",
    title: "Cancellation Options",
    summary: "How cancellations and refunds work for different listing types.",
    category: "support",
    relatedSlugs: ["payment-escrow", "host-terms"],
    sections: [
      {
        title: "Short stays",
        body: "Cancellation rules are set by each host (flexible, moderate, or strict) and shown before you pay. Refunds are processed according to the policy in effect at booking time.",
      },
      {
        title: "Rentals & leases",
        body: "Long-term rental cancellations depend on your application or lease agreement. Deposits may be subject to owner/agency terms and applicable tenancy law.",
      },
      {
        title: "Sales",
        body: "Purchase deposits and offer cancellations are governed by the sale agreement and Ghana conveyancing practice. Seek legal advice for binding contracts.",
      },
      {
        title: "Need help?",
        body: `Contact ${SUPPORT_EMAIL} with your booking or deal reference.`,
      },
    ],
  },
];

export const COMPANY_PAGES: LegalDocument[] = [
  {
    slug: "about",
    title: "About BaytMiftah",
    summary: "Ghana's home journey platform — search, rent, buy, lease, and host in one place.",
    category: "company",
    sections: [
      {
        title: "Our mission",
        body: "BaytMiftah connects people to property across Ghana and West Africa with verified agencies, secure payments, and tools for every step of the home journey.",
      },
      {
        title: "What we offer",
        bullets: [
          "Consumer search for rent, sale, lease, and short stays.",
          "Agent and agency workspace with listings, CRM, and documents.",
          "Wallets, escrow, and integrated payments where enabled.",
          "Multi-language support and local market defaults.",
        ],
      },
    ],
  },
  {
    slug: "careers",
    title: "Careers",
    summary: "Join the team building the future of property in Africa.",
    category: "company",
    sections: [
      {
        title: "Work with us",
        body: "We are growing engineering, product, operations, and partnerships teams in Accra and remotely. Send your CV and area of interest to careers@baytmiftah.com.",
      },
      {
        title: "Values",
        bullets: ["Trust and transparency", "Local-first product design", "Security by default", "Inclusive access to housing"],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    summary: "Reach the BaytMiftah team.",
    category: "company",
    sections: [
      {
        title: "General",
        body: `Support: ${SUPPORT_EMAIL}`,
      },
      {
        title: "Legal & privacy",
        body: `Legal: ${CONTACT_EMAIL} · Privacy: ${PRIVACY_EMAIL}`,
      },
      {
        title: "Office",
        body: "BaytMiftah · Accra, Ghana",
      },
    ],
  },
];

export const ALL_PAGES: LegalDocument[] = [...LEGAL_DOCUMENTS, ...SUPPORT_PAGES, ...COMPANY_PAGES];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return ALL_PAGES.find((doc) => doc.slug === slug);
}

export function getRelatedDocuments(slugs: string[] = []): LegalDocument[] {
  return slugs.map((slug) => getLegalDocument(slug)).filter(Boolean) as LegalDocument[];
}
