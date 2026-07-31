import type { LegalDocument } from "./legal-documents";

const CONTACT = "legal@baytmiftah.com";
const PRIVACY = "privacy@baytmiftah.com";
const SUPPORT = "support@baytmiftah.com";

/** Additional legal documents beyond the original 13. */
export const EXTENDED_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "aml-sanctions",
    title: "AML & Sanctions Policy",
    summary: "Anti-money laundering, sanctions screening, and suspicious activity reporting.",
    category: "legal",
    relatedSlugs: ["payment-escrow", "kyc-identity", "terms"],
    sections: [
      {
        title: "Purpose",
        body: "BaytMiftah maintains controls to detect and prevent money laundering, terrorist financing, and sanctions violations across wallets, escrow, and high-value property transactions, consistent with applicable Ghanaian law and international best practice.",
      },
      {
        title: "Customer due diligence",
        bullets: [
          "Identity verification for high-value transactions and wallet withdrawals.",
          "Enhanced due diligence for agencies, developers, and unusual payment patterns.",
          "Ongoing monitoring of transaction velocity, chargebacks, and fraud signals.",
        ],
      },
      {
        title: "Prohibited activity",
        bullets: [
          "Structuring payments to avoid reporting thresholds.",
          "Use of stolen or compromised payment instruments.",
          "Transactions involving sanctioned persons, entities, or jurisdictions.",
          "Listing properties you do not own or control for the purpose of laundering funds.",
        ],
      },
      {
        title: "Reporting",
        body: `Suspicious activity may be reported to relevant authorities as required by law. Users must cooperate with information requests. Contact ${CONTACT} for compliance enquiries.`,
      },
      {
        title: "Ghana context",
        body: "We align with Bank of Ghana payment-system guidance, Ghana's Anti-Money Laundering Act, and Financial Intelligence Centre requirements where applicable to our services.",
      },
    ],
  },
  {
    slug: "kyc-identity",
    title: "KYC & Identity Verification Policy",
    summary: "When and how BaytMiftah verifies identity, and what verification does not guarantee.",
    category: "legal",
    relatedSlugs: ["trust-verification", "aml-sanctions", "privacy"],
    sections: [
      {
        title: "When verification is required",
        bullets: [
          "Wallet withdrawals above platform thresholds.",
          "Publishing high-value sale or lease listings.",
          "Agency workspace activation and licence checks.",
          "Repeated fraud signals or account recovery.",
        ],
      },
      {
        title: "Information collected",
        bullets: [
          "Government-issued ID, selfie/liveness where enabled.",
          "Business registration and agency licence documents.",
          "Proof of address or property authority where relevant.",
        ],
      },
      {
        title: "Retention & security",
        body: "Verification documents are encrypted, access-controlled, and retained only as long as needed for compliance, disputes, and audit — see our Privacy Policy.",
      },
      {
        title: "Limitations",
        body: "KYC confirms identity at a point in time. It does not guarantee future conduct, property title, or financial solvency.",
      },
    ],
  },
  {
    slug: "refund-cancellation",
    title: "Refund & Cancellation Policy",
    summary: "Formal refund rules for bookings, deposits, and platform fees.",
    category: "legal",
    relatedSlugs: ["payment-escrow", "cancellation", "host-terms"],
    sections: [
      {
        title: "Short stays",
        bullets: [
          "Cancellation tier (flexible, moderate, strict) is shown before payment.",
          "Refunds are calculated from the host policy active at booking time.",
          "Service fees may be non-refundable where disclosed at checkout.",
        ],
      },
      {
        title: "Rentals & leases",
        body: "Application fees and holding deposits follow the listing party's terms and Ghana tenancy law. BaytMiftah processes refunds only where payment was collected through platform checkout.",
      },
      {
        title: "Sales & milestones",
        bullets: [
          "Deposit refunds depend on the sale agreement and milestone status.",
          "Escrow releases follow Payment & Escrow Terms and dispute outcomes.",
          "Processing times: 5–14 business days after approval, depending on banks.",
        ],
      },
      {
        title: "Chargebacks",
        body: "Unauthorized chargebacks may result in account suspension. We provide evidence to payment partners where permitted.",
      },
      {
        title: "How to request",
        body: `Submit a request via /complaint with your booking or transaction reference, or email ${SUPPORT}.`,
      },
    ],
  },
  {
    slug: "service-fees",
    title: "Service Fees & Pricing Policy",
    summary: "Platform fees, host fees, agency tools, and featured placement.",
    category: "legal",
    relatedSlugs: ["payment-escrow", "terms"],
    sections: [
      {
        title: "Consumer fees",
        body: "Service fees may apply to bookings and certain transactions. Fees are shown before you confirm payment.",
      },
      {
        title: "Host & owner fees",
        bullets: [
          "Short-stay host service fee deducted from payout where applicable.",
          "Featured or promoted listing fees billed at purchase.",
          "Optional workspace subscription fees for agencies.",
        ],
      },
      {
        title: "Taxes",
        body: "Prices may exclude VAT, NHIL, GETFund Levy, or other taxes where required. You are responsible for taxes on your income from platform activity.",
      },
      {
        title: "Changes",
        body: "We may update fees with notice on the platform. Confirmed transactions use the fee disclosed at checkout.",
      },
    ],
  },
  {
    slug: "e-signature",
    title: "E-Signature & Electronic Records Policy",
    summary: "Use of electronic signatures and records on BaytMiftah.",
    category: "legal",
    relatedSlugs: ["terms", "data-processing"],
    sections: [
      {
        title: "Electronic Transactions Act",
        body: "Where enabled, electronic signatures and records are intended to be legally binding under Ghana's Electronic Transactions Act, 2008 (Act 772), subject to document type and party consent.",
      },
      {
        title: "Your consent",
        bullets: [
          "You consent to receive agreements, notices, and receipts electronically.",
          "You may request paper copies where law requires.",
          "You are responsible for reviewing documents before signing.",
        ],
      },
      {
        title: "Audit trail",
        body: "We log signer identity, timestamp, document version, and IP address where available for dispute resolution.",
      },
    ],
  },
  {
    slug: "data-processing",
    title: "Data Processing Agreement",
    summary: "Terms for agencies and workspaces processing client data on BaytMiftah.",
    category: "legal",
    relatedSlugs: ["privacy", "agency-terms"],
    sections: [
      {
        title: "Roles",
        body: "BaytMiftah acts as data controller for platform accounts. Agencies using workspace CRM tools act as independent controllers (or processors, where agreed) for client data they upload.",
      },
      {
        title: "Agency obligations",
        bullets: [
          "Obtain lawful basis and consent for client data you upload.",
          "Use data only for legitimate property services.",
          "Implement appropriate security and access controls for team members.",
          "Notify BaytMiftah of breaches affecting platform data without undue delay.",
        ],
      },
      {
        title: "Subprocessors",
        body: "BaytMiftah uses Supabase, Vercel, Resend, Paystack, Stripe, and other providers listed in our Privacy Policy under contract.",
      },
      {
        title: "Data subject requests",
        body: `Direct privacy requests to ${PRIVACY}. Agencies must respond to their clients' requests for data they control.`,
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    summary: "Our commitment to accessible design and how to request accommodations.",
    category: "legal",
    relatedSlugs: ["terms"],
    sections: [
      {
        title: "Commitment",
        body: "BaytMiftah aims to meet WCAG 2.1 Level AA where practicable across web and mobile experiences.",
      },
      {
        title: "Measures",
        bullets: [
          "Keyboard navigation and semantic HTML on core flows.",
          "Sufficient colour contrast and responsive layouts.",
          "Alt text for listing imagery where provided by uploaders.",
        ],
      },
      {
        title: "Feedback",
        body: `Report accessibility barriers to ${SUPPORT}. We will endeavour to respond within 10 business days.`,
      },
    ],
  },
  {
    slug: "fair-housing",
    title: "Fair Housing & Community Standards",
    summary: "Non-discrimination requirements for listings and communications.",
    category: "legal",
    relatedSlugs: ["marketplace-rules", "acceptable-use", "owner-terms"],
    sections: [
      {
        title: "Equal access",
        body: "Discrimination based on race, ethnicity, religion, gender, disability, family status, sexual orientation, or other protected characteristics is prohibited in listings, screening, and messaging.",
      },
      {
        title: "Listings",
        bullets: [
          "No discriminatory preferences in descriptions or house rules.",
          "Reasonable accommodations for disabilities where required by law.",
          "Accurate availability — no bait-and-switch tactics.",
        ],
      },
      {
        title: "Enforcement",
        body: "Violations may result in listing removal, account suspension, and referral to regulators.",
      },
      {
        title: "Ghana context",
        body: "We support fair access to housing consistent with Ghana's Constitution and applicable anti-discrimination principles.",
      },
    ],
  },
  {
    slug: "insurance-liability",
    title: "Insurance & Liability Disclaimer",
    summary: "What platform protection does and does not cover.",
    category: "legal",
    relatedSlugs: ["marketplace-rules", "host-terms", "terms"],
    sections: [
      {
        title: "No substitute for insurance",
        body: "BaytMiftah does not provide property, liability, or travel insurance unless explicitly stated in a separate written programme.",
      },
      {
        title: "Host & owner responsibility",
        bullets: [
          "Maintain property insurance and comply with local safety codes.",
          "Disclose hazards and maintain working safety equipment.",
        ],
      },
      {
        title: "Guest & tenant responsibility",
        body: "Guests and tenants are responsible for damage they cause beyond normal wear, subject to agreements and applicable law.",
      },
    ],
  },
  {
    slug: "whitelabel-partner",
    title: "Whitelabel & B2B Partner Terms",
    summary: "Terms for agencies and partners operating branded BaytMiftah workspaces.",
    category: "legal",
    relatedSlugs: ["agency-terms", "data-processing", "service-fees"],
    sections: [
      {
        title: "Branding",
        body: "Whitelabel partners may apply approved branding within workspace UI. BaytMiftah marks remain on consumer checkout and legal pages unless otherwise contracted.",
      },
      {
        title: "Partner responsibilities",
        bullets: [
          "Compliance with real estate licensing and consumer protection law.",
          "Accurate representation of BaytMiftah capabilities to end clients.",
          "Payment of subscription and usage fees per agreement.",
        ],
      },
      {
        title: "Termination",
        body: "Either party may terminate per contract. Data export is available for 30 days after termination where technically feasible.",
      },
    ],
  },
  {
    slug: "vendor-contractor",
    title: "Vendor & Contractor Terms",
    summary: "Terms for maintenance vendors and service providers on the marketplace.",
    category: "legal",
    relatedSlugs: ["marketplace-rules", "acceptable-use"],
    sections: [
      {
        title: "Independent contractors",
        body: "Vendors are independent businesses, not employees or agents of BaytMiftah.",
      },
      {
        title: "Requirements",
        bullets: [
          "Valid business registration and insurance where required.",
          "Accurate service descriptions and pricing.",
          "Professional conduct on-site and in communications.",
        ],
      },
      {
        title: "Disputes",
        body: "Service disputes are primarily between vendor and client. BaytMiftah may assist with evidence review where payments were platform-mediated.",
      },
    ],
  },
];

/** Extra sections appended to existing documents. */
export const DOCUMENT_SECTION_ENHANCEMENTS: Record<string, LegalDocument["sections"]> = {
  terms: [
    {
      title: "Severability & entire agreement",
      body: "If any provision is unenforceable, the remainder stays in effect. These terms, together with referenced policies, form the entire agreement regarding platform use.",
    },
    {
      title: "Assignment",
      body: "You may not assign your account without our consent. We may assign our rights in connection with a merger, acquisition, or sale of assets.",
    },
    {
      title: "Survival",
      body: "Sections on liability, indemnification, governing law, and dispute resolution survive account termination.",
    },
    {
      title: "Third-party services",
      bullets: [
        "Paystack, Stripe, Supabase, Vercel, Resend, Google Maps, and AI assistants are third-party services subject to their own terms.",
        "BaytMiftah is not responsible for third-party outages beyond reasonable care.",
      ],
    },
    {
      title: "Sanctions & fraud reporting",
      body: "You represent you are not subject to sanctions and will report suspected fraud via /complaint or support@baytmiftah.com.",
    },
  ],
  privacy: [
    {
      title: "Subprocessors",
      bullets: [
        "Supabase — database, auth, storage (EU/US).",
        "Vercel — web hosting and edge delivery.",
        "Resend — transactional email.",
        "Paystack / Stripe — payment processing.",
        "Google — maps and optional analytics.",
      ],
    },
    {
      title: "Automated decision-making",
      body: "We may use automated signals for fraud prevention, search ranking, and trust scores. You may contact us to request human review where required by law.",
    },
    {
      title: "Breach notification",
      body: "We will notify affected users and regulators of personal data breaches as required by Ghana's Data Protection Act and applicable law.",
    },
    {
      title: "Data Protection Commission",
      body: "BaytMiftah processes personal data in accordance with Ghana's Data Protection Act, 2012 (Act 843). You may lodge complaints with the Data Protection Commission.",
    },
  ],
  "payment-escrow": [
    {
      title: "Escrow timelines",
      bullets: [
        "Short stays: funds typically release 24 hours after check-in unless a dispute is opened.",
        "Rent milestones: release on mutual confirmation or automatic expiry of dispute window (7 days).",
        "Sale deposits: release per milestone agreement or court/regulator order.",
      ],
    },
    {
      title: "Failed payments & holds",
      body: "Insufficient funds, expired cards, or provider errors may delay booking confirmation. Payouts may be held during KYC review or chargeback investigation.",
    },
    {
      title: "FX & cross-border",
      body: "Cross-border payments may incur conversion spreads disclosed at checkout. Settlement currency is shown before you pay.",
    },
  ],
  "dispute-resolution": [
    {
      title: "Step-by-step process",
      bullets: [
        "Step 1: Parties attempt direct resolution via in-app messaging (14 days).",
        "Step 2: Either party submits evidence via /complaint (case reference issued).",
        "Step 3: BaytMiftah reviews escrow-eligible disputes within 10 business days where offered.",
        "Step 4: Unresolved disputes proceed to courts or arbitration per governing law.",
      ],
    },
    {
      title: "Evidence rules",
      body: "Submit timestamps, messages, photos, receipts, and agreements. BaytMiftah may request additional documentation.",
    },
    {
      title: "Limits of mediation",
      body: "BaytMiftah is not obligated to mediate off-platform transactions or disputes unrelated to platform-mediated payments.",
    },
  ],
  copyright: [
    {
      title: "Takedown form",
      body: "Use /complaint and select \"Copyright / IP\" for structured submissions, or email legal@baytmiftah.com with the details in our reporting section.",
    },
  ],
};

export function mergeLegalDocuments(base: LegalDocument[]): LegalDocument[] {
  const enhanced = base.map((doc) => {
    const extra = DOCUMENT_SECTION_ENHANCEMENTS[doc.slug];
    if (!extra?.length) return doc;
    return { ...doc, sections: [...doc.sections, ...extra] };
  });
  return [...enhanced, ...EXTENDED_LEGAL_DOCUMENTS];
}
