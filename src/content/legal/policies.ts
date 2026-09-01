import { LEGAL_CONTACT } from "../../lib/legal-config";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  PLATFORM_ROLE_STATEMENT,
  type LegalDocument,
} from "./types";

function policy(
  doc: Omit<LegalDocument, "effectiveDate" | "lastUpdated"> &
    Partial<Pick<LegalDocument, "effectiveDate" | "lastUpdated">>,
): LegalDocument {
  return {
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    lastUpdated: LEGAL_LAST_UPDATED,
    ...doc,
  };
}

export const LEGAL_POLICIES: LegalDocument[] = [
  policy({
    slug: "terms",
    title: "Terms of Service",
    category: "general",
    description:
      "These Terms govern access to and use of BaytMiftah websites, applications, software, workspaces, APIs, marketplace services, and related products.",
    seoTitle: "BaytMiftah Terms of Service",
    seoDescription:
      "Read the BaytMiftah Terms of Service. BaytMiftah is a neutral technology marketplace and does not hold customer funds or act as a party to user transactions.",
    relatedPolicies: ["marketplace-rules", "privacy", "payments", "disputes"],
    sections: [
      {
        heading: "Overview",
        content:
          "These Terms of Service govern access to and use of BaytMiftah websites, applications, software, workspaces, APIs, marketplace services, and related products. By accessing BaytMiftah, creating an account, publishing a listing, contacting another user, requesting a viewing, making a booking, using a workspace, or otherwise using the platform, the user agrees to these Terms. If the user does not agree, they must not use BaytMiftah.",
      },
      {
        heading: "Eligibility",
        bullets: [
          "Users must have the legal capacity required to enter into agreements applicable to their activities.",
          "Certain BaytMiftah services may have additional age, identity, business, verification, or regulatory requirements.",
          "Users are responsible for complying with all laws applicable to their use of the platform.",
        ],
      },
      {
        heading: "Accounts",
        content:
          "Users must provide accurate and current information when creating an account and are responsible for activity conducted through that account, including protection of login credentials. Users must not:",
        bullets: [
          "impersonate another person;",
          "provide false identity or business information;",
          "use another person's account without authorisation;",
          "create accounts for fraudulent purposes;",
          "sell or transfer an account without permission;",
          "circumvent account restrictions.",
        ],
      },
      {
        heading: "BaytMiftah's role",
        content:
          "BaytMiftah provides technology and marketplace infrastructure. Depending on the product, BaytMiftah may provide:",
        bullets: [
          "property discovery;",
          "listing tools;",
          "search;",
          "messaging;",
          "viewing requests;",
          "booking workflows;",
          "transaction records;",
          "agency workspaces;",
          "property-management tools;",
          "vendor discovery;",
          "verification features;",
          "notifications;",
          "analytics;",
          "other technology services.",
        ],
      },
      {
        heading: "What BaytMiftah is not",
        content:
          "Providing these services does not make BaytMiftah the landlord, tenant, buyer, seller, host, guest, broker, agent, property manager, developer, contractor, insurer, or legal representative of a user. Unless expressly stated otherwise in a separate agreement, BaytMiftah is not a party to the underlying agreement between users. BaytMiftah does not own, sell, lease, rent, manage, occupy, or control properties merely because those properties are displayed on the platform.",
      },
      {
        heading: "Listings",
        content:
          "Listings may be submitted by property owners, landlords, sellers, hosts, agents, agencies, developers, property managers, or other authorised users. The person or business publishing a listing is responsible for its accuracy. BaytMiftah does not automatically guarantee:",
        bullets: [
          "ownership;",
          "title;",
          "authority to sell or lease;",
          "property condition;",
          "valuation;",
          "availability;",
          "dimensions;",
          "planning status;",
          "zoning;",
          "permits;",
          "suitability;",
          "legal status;",
          "future performance.",
        ],
      },
      {
        heading: "Due diligence",
        content: "Users should conduct appropriate independent due diligence before entering a transaction.",
      },
      {
        heading: "Transactions",
        content:
          "The underlying transaction is generally between the relevant users. A rental agreement may be between a landlord and tenant. A sale may be between a seller and buyer. A short-stay booking may be between a host and guest. BaytMiftah may provide supporting technology but is not automatically a party to those contracts.",
      },
      {
        heading: "Payments",
        content: PLATFORM_ROLE_STATEMENT,
        bullets: [
          "Where payment functionality is available, processing is handled by the applicable third-party payment provider, bank, mobile-money operator, card network, or other financial institution.",
          "BaytMiftah does not independently hold customer funds, operate a custodial or escrow account, issue electronic money, provide banking services, or act as a financial institution.",
          "Where a user chooses to make a payment through a BaytMiftah payment flow, the payment is processed through the applicable third-party payment provider.",
          "Users must review the payment recipient and amount before authorising a payment.",
        ],
      },
      {
        heading: "Fees",
        content: "BaytMiftah may charge disclosed fees for platform services. Potential fees include:",
        bullets: [
          "subscriptions;",
          "premium listings;",
          "featured placement;",
          "agency tools;",
          "property-management software;",
          "advertising;",
          "B2B services;",
          "other technology services.",
        ],
      },
      {
        heading: "Prohibited activity",
        content: "Users must not use BaytMiftah for:",
        bullets: [
          "fraud;",
          "impersonation;",
          "unlawful discrimination;",
          "deceptive listings;",
          "fake reviews;",
          "harassment;",
          "threats;",
          "unauthorised access;",
          "malware;",
          "unlawful property transactions;",
          "intellectual-property infringement;",
          "other unlawful activity.",
        ],
      },
      {
        heading: "Suspension",
        content:
          "BaytMiftah may suspend, restrict, or terminate an account, listing, transaction workflow, or feature where reasonably necessary for safety, security, fraud prevention, legal compliance, investigation, or enforcement of the Terms.",
      },
      {
        heading: "Changes",
        content:
          "BaytMiftah may update these Terms from time to time. Material changes may be communicated through appropriate channels. The most recent version will be published on the BaytMiftah platform.",
      },
      {
        heading: "Governing law",
        content:
          "Unless otherwise required by applicable law, these Terms are governed by the laws of the Republic of Ghana.",
      },
    ],
  }),
  policy({
    slug: "privacy",
    title: "Privacy Policy",
    category: "general",
    description: "How BaytMiftah collects, uses, stores, and protects personal information.",
    seoTitle: "BaytMiftah Privacy Policy",
    seoDescription:
      "Learn how BaytMiftah collects, uses, protects, and manages personal information across its property marketplace and technology services.",
    relatedPolicies: ["cookies", "data-processing", "terms"],
    sections: [
      {
        heading: "Overview",
        content:
          "BaytMiftah collects and processes personal information in connection with account management, marketplace operations, communications, security, customer support, analytics, verification, and other legitimate platform purposes. This policy is designed around applicable Ghanaian data-protection requirements, including the Data Protection Act, 2012 (Act 843). The Data Protection Commission is the relevant regulator. This policy does not claim any specific certification or registration status.",
      },
      {
        heading: "Information we may collect",
        content: "Depending on use of BaytMiftah, we may collect:",
        bullets: [
          "account information, such as name, email address, and telephone number;",
          "profile information;",
          "business information;",
          "property information;",
          "communications;",
          "device information;",
          "IP information;",
          "usage data;",
          "verification information;",
          "transaction-related information;",
          "approximate or precise location where permitted and necessary.",
        ],
      },
      {
        heading: "Why information is processed",
        content: "We may use personal information to:",
        bullets: [
          "create and administer accounts;",
          "provide marketplace services;",
          "display listings;",
          "facilitate communication;",
          "process platform service requests;",
          "provide customer support;",
          "prevent fraud and abuse;",
          "secure the platform;",
          "verify information;",
          "improve products;",
          "perform analytics;",
          "comply with legal obligations;",
          "enforce our agreements.",
        ],
      },
      {
        heading: "Information shared with users",
        content:
          "Some information may be displayed to other users when necessary for marketplace functionality, such as listing details, public profile information, business details, reviews, photographs, and inquiry information where enabled. Users should not publish information they are not authorised to disclose.",
      },
      {
        heading: "Third-party processors",
        content:
          "BaytMiftah may use third-party service providers for hosting, analytics, messaging, identity verification, payment processing, security, cloud services, customer support, and other infrastructure. Supported payments are processed by the applicable third-party payment provider. Users may also be subject to that provider's own terms and privacy policy. Where a third party processes personal data, the applicable contractual and legal requirements will govern that processing.",
      },
      {
        heading: "Analytics",
        content:
          "We may use analytics technologies to understand platform usage and improve services, subject to cookie and consent controls where applicable.",
      },
      {
        heading: "Security",
        content:
          "BaytMiftah uses reasonable technical and organisational measures designed to protect personal information. No internet service can guarantee absolute security.",
      },
      {
        heading: "Retention",
        content:
          "BaytMiftah retains information for as long as reasonably necessary for the relevant business, contractual, security, dispute-resolution, accounting, or legal purposes.",
      },
      {
        heading: "User rights",
        content: `Depending on applicable law, users may have rights relating to access, correction, objection, deletion, consent withdrawal, and other controls concerning personal information. Privacy requests may be sent to ${LEGAL_CONTACT.privacy}.`,
      },
    ],
  }),
  policy({
    slug: "cookies",
    title: "Cookie Policy",
    category: "general",
    description: "How BaytMiftah uses cookies, local storage, pixels, SDKs, and similar technologies.",
    seoTitle: "BaytMiftah Cookie Policy",
    seoDescription:
      "Understand how BaytMiftah uses cookies and similar technologies for essential functionality, preferences, analytics, and marketing where permitted.",
    relatedPolicies: ["privacy"],
    showCookieControls: true,
    sections: [
      {
        heading: "Technologies we may use",
        content:
          "BaytMiftah may use cookies, local storage, pixels, SDKs, and similar technologies on websites, applications, and related products.",
      },
      {
        heading: "Essential cookies",
        content:
          "Essential technologies support login, security, authentication, sessions, and core platform functions. These are required for the service to operate.",
      },
      {
        heading: "Preferences",
        content: "Preference technologies remember settings such as language, market, and display options.",
      },
      {
        heading: "Analytics",
        content: "Analytics technologies help BaytMiftah understand platform usage and improve services.",
      },
      {
        heading: "Marketing",
        content:
          "Marketing technologies may be used where permitted by law and applicable consent requirements.",
      },
      {
        heading: "Cookie controls",
        content:
          "Users may control cookies through browser settings and available BaytMiftah consent controls. Disabling certain technologies may affect functionality. Use the cookie-preference control on this page to review or update choices where the consent-management system is available.",
      },
    ],
  }),
  policy({
    slug: "marketplace-rules",
    title: "Marketplace Rules",
    category: "general",
    description:
      "BaytMiftah is a neutral marketplace. Listing publishers remain responsible for accuracy, and users should perform independent due diligence.",
    seoTitle: "BaytMiftah Marketplace Rules",
    seoDescription:
      "Marketplace rules for BaytMiftah listings, user responsibilities, and the limits of platform verification.",
    relatedPolicies: ["terms", "trust-verification", "non-discrimination"],
    sections: [
      {
        heading: "Neutral marketplace",
        content:
          "Marketplace content may come from users. The person or business creating a listing is responsible for the listing. Users should independently assess important information before committing to a property transaction.",
      },
      {
        heading: "No automatic guarantees",
        content: "BaytMiftah does not guarantee:",
        bullets: [
          "ownership;",
          "title;",
          "authority;",
          "authenticity of every document;",
          "property condition;",
          "legality of every listing;",
          "availability;",
          "pricing accuracy;",
          "user conduct;",
          "contractual performance.",
        ],
      },
      {
        heading: "Verification is not a guarantee",
        content:
          "Verification features, reviews, badges, profiles, and platform data are intended to help reduce transaction risk but are not guarantees.",
      },
    ],
  }),
  policy({
    slug: "payments",
    title: "Payments & Transaction Processing Policy",
    category: "payments",
    description:
      "BaytMiftah is a technology marketplace and does not hold, custody, safeguard, or control customer funds. Supported payments are processed by the applicable third-party payment provider.",
    seoTitle: "BaytMiftah Payments & Transaction Processing Policy",
    seoDescription:
      "BaytMiftah does not hold customer funds. Supported payments are processed by the applicable third-party payment provider, bank, or financial institution.",
    relatedPolicies: ["refunds", "fees", "terms", "disputes"],
    sections: [
      {
        heading: "Payment infrastructure",
        content:
          "BaytMiftah uses third-party payment providers as payment infrastructure for supported payment flows. BaytMiftah remains a neutral real-estate technology marketplace.",
      },
      {
        heading: "What BaytMiftah does not independently do",
        content: "BaytMiftah does not independently:",
        bullets: [
          "hold customer funds;",
          "operate a custodial account;",
          "operate an escrow account;",
          "issue electronic money;",
          "provide banking services;",
          "act as a financial institution.",
        ],
      },
      {
        heading: "Payments & transaction processing",
        content:
          "BaytMiftah may partner with third-party payment providers to provide payment functionality for supported transactions. BaytMiftah does not itself hold, custody, or safeguard customer funds. When you initiate a supported payment through BaytMiftah, you may be redirected to, connected with, or otherwise use the applicable payment provider's infrastructure. The payment provider and the relevant financial institutions are responsible for processing the payment according to their applicable terms, policies, regulatory obligations, and transaction procedures.",
      },
      {
        heading: "How payments are processed",
        content:
          "Where a user chooses to make a payment through a BaytMiftah payment flow, the payment is processed through the applicable third-party payment provider. The actual processing, movement, settlement, and custody of funds are handled by the applicable payment provider and financial institutions involved in the transaction.",
      },
      {
        heading: "What BaytMiftah may do",
        content: "BaytMiftah may:",
        bullets: [
          "initiate or facilitate payment requests;",
          "display payment instructions;",
          "generate or provide payment links;",
          "receive payment-status information from the payment provider;",
          "associate a payment reference with a BaytMiftah transaction;",
          "display payment confirmation;",
          "update transaction status based on provider notifications.",
        ],
      },
      {
        heading: "Payment confirmation",
        content:
          "A payment shown as completed in BaytMiftah means that BaytMiftah has received a corresponding payment-status notification or confirmation from the applicable payment provider. BaytMiftah may receive payment-status information, transaction references, confirmations, or other limited information necessary to operate the marketplace and update the relevant transaction workflow. Where there is a discrepancy, users may need to provide the relevant payment-provider transaction reference so that the payment can be investigated.",
      },
      {
        heading: "Payment disputes",
        content:
          "Questions concerning the processing, authorisation, settlement, reversal, chargeback, or delivery of a payment may involve the applicable payment provider, the relevant bank, card network, mobile-money provider, or other financial institution. BaytMiftah may assist by providing relevant marketplace records and transaction references, but does not independently control the payment infrastructure.",
      },
      {
        heading: "Refunds",
        content:
          "Where a refund is supported, the applicable refund may be processed through the applicable payment provider. BaytMiftah does not hold the underlying funds and does not independently maintain customer balances.",
      },
      {
        heading: "Provider terms",
        content:
          "Users may also be subject to the applicable payment provider's own terms, privacy policy, compliance requirements, and transaction rules. Users may be required to accept those terms and satisfy the provider's verification, compliance, fraud-prevention, and transaction requirements. A payment provider may decline, delay, restrict, or reverse a transaction in accordance with its policies and applicable law. This policy does not state that BaytMiftah is itself a licensed payment institution.",
      },
      {
        heading: "User responsibility",
        content:
          "Users must check the payment recipient and amount before authorising payment. Facilitation of a payment request does not mean that BaytMiftah receives or controls the underlying funds.",
      },
      {
        heading: "Ghana payment-services framework",
        content:
          "Payment activities in Ghana are subject to a regulated framework under the Payment Systems and Services Act, 2019 (Act 987), with Bank of Ghana licensing and authorisation applying to relevant payment-service activities. BaytMiftah will only provide payment-related functionality consistent with its actual business model and any required regulatory arrangements.",
      },
    ],
  }),
  policy({
    slug: "refunds",
    title: "Refund & Cancellation Policy",
    category: "payments",
    description:
      "Cancellation rights depend on the underlying transaction. Where a refund is supported, it may be processed through the applicable payment provider. BaytMiftah does not hold customer funds.",
    seoTitle: "BaytMiftah Refund & Cancellation Policy",
    seoDescription:
      "How cancellations and refunds work on BaytMiftah, including underlying transaction rules, platform fees, and third-party payment-provider refunds.",
    relatedPolicies: ["payments", "host-terms", "fees"],
    sections: [
      {
        heading: "BaytMiftah does not hold refund funds",
        content:
          "BaytMiftah does not hold customer funds and therefore does not independently possess transaction money for the purpose of issuing refunds.",
      },
      {
        heading: "Underlying transaction cancellation",
        content:
          "Cancellation rights depend on the underlying transaction. The applicable property owner, host, agency, vendor, or other transaction party may have a cancellation policy, subject to applicable law and platform rules.",
      },
      {
        heading: "BaytMiftah service fees",
        content:
          "Where BaytMiftah itself charges a platform fee, the applicable refund treatment will be disclosed when the service is purchased.",
      },
      {
        heading: "Third-party payment refunds",
        content:
          "Where a refund is supported, the applicable refund may be processed through the applicable payment provider. Processing times may depend on the payment provider, bank, card network, mobile-money operator, or other financial institution. BaytMiftah does not hold the underlying funds and does not independently maintain customer balances.",
      },
    ],
  }),
  policy({
    slug: "fees",
    title: "Service Fees & Pricing Policy",
    category: "payments",
    description:
      "BaytMiftah platform fees are separate from property prices, rent, deposits, commissions, taxes, and payment-provider charges.",
    seoTitle: "BaytMiftah Service Fees & Pricing Policy",
    seoDescription:
      "How BaytMiftah charges for platform services, and how those fees differ from property prices, rent, deposits, and third-party charges.",
    relatedPolicies: ["payments", "terms", "whitelabel"],
    sections: [
      {
        heading: "Platform revenue sources",
        content: "BaytMiftah may charge for platform services including:",
        bullets: [
          "premium listings;",
          "featured placement;",
          "agency subscriptions;",
          "property-management tools;",
          "advertising;",
          "B2B services;",
          "other technology services.",
        ],
      },
      {
        heading: "Separate from user transactions",
        content: "BaytMiftah's fees are separate from:",
        bullets: [
          "property price;",
          "rent;",
          "deposit;",
          "landlord fee;",
          "agent commission;",
          "vendor fee;",
          "tax;",
          "payment-provider fee.",
        ],
      },
      {
        heading: "User-set prices",
        content:
          "Unless expressly stated, BaytMiftah does not determine the price of a property or service offered by users. Any BaytMiftah platform fee will be displayed separately from amounts paid directly to third parties where applicable.",
      },
    ],
  }),
  policy({
    slug: "e-signatures",
    title: "Electronic Signatures & Records Policy",
    category: "payments",
    description:
      "BaytMiftah may use electronic records, acknowledgements, platform acceptance, notices, and digital agreements where appropriate.",
    seoTitle: "BaytMiftah Electronic Signatures & Records Policy",
    seoDescription:
      "How BaytMiftah uses electronic records, acknowledgements, and digital agreements on its property marketplace.",
    relatedPolicies: ["terms", "data-processing"],
    sections: [
      {
        heading: "Electronic records",
        content:
          "BaytMiftah may use electronic records, digital acknowledgements, electronic acceptance, notices, and digital agreements where appropriate. Records may include account agreements, booking records, listing acknowledgements, transaction records, notices, agency agreements, and platform communications. Users should review documents carefully before accepting them.",
      },
      {
        heading: "Scope",
        content:
          "This policy does not imply that every transaction necessarily receives a legally binding electronic signature. Availability depends on the feature in use and the document type.",
      },
      {
        heading: "Ghana framework",
        content:
          "The Electronic Transactions Act, 2008 (Act 772) forms part of Ghana's legal framework for electronic transactions and communications.",
      },
    ],
  }),
  policy({
    slug: "host-terms",
    title: "Host Terms — Short Stay",
    category: "participants",
    description:
      "Additional terms for short-stay hosts. BaytMiftah is not the host or property operator merely because a host uses the platform.",
    seoTitle: "BaytMiftah Host Terms — Short Stay",
    seoDescription:
      "Terms for short-stay hosts on BaytMiftah, including authority, accuracy, safety, and independent operator responsibilities.",
    relatedPolicies: ["tenant-guest-rules", "refunds", "payments"],
    sections: [
      {
        heading: "Host obligations",
        content: "Hosts must:",
        bullets: [
          "have authority to offer the property;",
          "provide accurate information;",
          "disclose important restrictions;",
          "comply with applicable rules;",
          "follow applicable safety requirements;",
          "honour accepted bookings except where cancellation is permitted;",
          "treat guests lawfully and respectfully;",
          "protect guest information.",
        ],
      },
      {
        heading: "Independent operator",
        content:
          "Hosts remain responsible for licences, permits, taxes, insurance, and other obligations applicable to their activity. BaytMiftah is not the host or property operator merely because the host uses BaytMiftah.",
      },
    ],
  }),
  policy({
    slug: "property-owner-terms",
    title: "Property Owner Terms",
    category: "participants",
    description: "Terms for owners and authorised representatives listing properties on BaytMiftah.",
    seoTitle: "BaytMiftah Property Owner Terms",
    seoDescription:
      "Obligations for property owners and authorised representatives advertising on the BaytMiftah marketplace.",
    relatedPolicies: ["agency-agent-terms", "marketplace-rules", "non-discrimination"],
    sections: [
      {
        heading: "Owner and representative obligations",
        content: "Owners and authorised representatives must:",
        bullets: [
          "have authority to advertise the property;",
          "provide accurate information;",
          "disclose material restrictions;",
          "accurately state price and availability;",
          "avoid fake listings;",
          "avoid impersonation;",
          "avoid deceptive advertising.",
        ],
      },
      {
        heading: "Removal",
        content: "BaytMiftah may remove fraudulent, misleading, unsafe, or unlawful listings.",
      },
    ],
  }),
  policy({
    slug: "agency-agent-terms",
    title: "Agency & Agent Terms",
    category: "participants",
    description:
      "Terms for agencies and agents using BaytMiftah workspace tools. BaytMiftah is not itself the agency or broker.",
    seoTitle: "BaytMiftah Agency & Agent Terms",
    seoDescription:
      "Terms for real-estate agencies and agents using BaytMiftah workspaces, listings, and workflow tools.",
    relatedPolicies: ["property-owner-terms", "data-processing", "trust-verification"],
    sections: [
      {
        heading: "Agency and agent obligations",
        content: "Agencies and agents must:",
        bullets: [
          "provide accurate business information;",
          "ensure authorised users operate agency accounts;",
          "remain responsible for clients, employees, listings, representations, and transactions.",
        ],
      },
      {
        heading: "Workspace functionality",
        content: "BaytMiftah workspace functionality may include:",
        bullets: [
          "listings;",
          "leads;",
          "client records;",
          "communications;",
          "permissions;",
          "reporting;",
          "workflow tools.",
        ],
      },
      {
        heading: "BaytMiftah is not the agency",
        content:
          "Providing workspace software does not make BaytMiftah a real-estate agency, broker, or the legal agent of the customer.",
      },
    ],
  }),
  policy({
    slug: "tenant-guest-rules",
    title: "Tenant & Guest Rules",
    category: "participants",
    description: "Conduct expectations for tenants and short-stay guests using BaytMiftah.",
    seoTitle: "BaytMiftah Tenant & Guest Rules",
    seoDescription:
      "Rules for tenants and guests using BaytMiftah, including accurate information, property respect, and lawful conduct.",
    relatedPolicies: ["host-terms", "acceptable-use"],
    sections: [
      {
        heading: "Obligations",
        content: "Tenants and guests must:",
        bullets: [
          "provide accurate information;",
          "comply with agreed terms;",
          "pay amounts owed to the appropriate transaction party;",
          "respect property rules;",
          "avoid damage;",
          "avoid unlawful activity;",
          "respect neighbours and occupants.",
        ],
      },
    ],
  }),
  policy({
    slug: "vendor-terms",
    title: "Vendor & Contractor Terms",
    category: "participants",
    description:
      "Vendors remain responsible for their own services. BaytMiftah does not automatically become a party to the vendor contract.",
    seoTitle: "BaytMiftah Vendor & Contractor Terms",
    seoDescription:
      "Terms for maintenance, repair, and property-service vendors offering services through the BaytMiftah marketplace.",
    relatedPolicies: ["marketplace-rules", "acceptable-use"],
    sections: [
      {
        heading: "Vendor services",
        content: "Vendors may offer:",
        bullets: [
          "maintenance;",
          "repairs;",
          "cleaning;",
          "moving;",
          "inspection;",
          "photography;",
          "construction;",
          "property services.",
        ],
      },
      {
        heading: "Vendor responsibility",
        content: "Vendors remain responsible for their own:",
        bullets: [
          "services;",
          "qualifications;",
          "licensing;",
          "insurance;",
          "pricing;",
          "taxes;",
          "warranties;",
          "contractual obligations.",
        ],
      },
      {
        heading: "Marketplace technology layer",
        content:
          "BaytMiftah is the marketplace technology layer and does not automatically become a party to the vendor contract.",
      },
    ],
  }),
  policy({
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    category: "trust",
    description: "Prohibited uses of the BaytMiftah platform.",
    seoTitle: "BaytMiftah Acceptable Use Policy",
    seoDescription:
      "Prohibited conduct on BaytMiftah, including fraud, impersonation, harassment, and unlawful transactions.",
    relatedPolicies: ["terms", "marketplace-rules", "non-discrimination"],
    sections: [
      {
        heading: "Prohibited activity",
        content: "Users may not use BaytMiftah to:",
        bullets: [
          "conduct fraud;",
          "impersonate others;",
          "create fake identities;",
          "create fake listings;",
          "manipulate or publish fake reviews;",
          "harass users;",
          "threaten users;",
          "discriminate unlawfully;",
          "distribute malware;",
          "gain unauthorised access;",
          "circumvent security;",
          "scrape restricted data;",
          "infringe intellectual property;",
          "facilitate unlawful transactions;",
          "use the platform for other unlawful purposes.",
        ],
      },
      {
        heading: "Enforcement",
        content: "BaytMiftah may remove content and restrict accounts that violate this policy.",
      },
    ],
  }),
  policy({
    slug: "trust-verification",
    title: "Trust & Verification Policy",
    category: "trust",
    description:
      "Verification means only that the applicable verification process has been completed. It is not a guarantee of honesty, ownership, or future conduct.",
    seoTitle: "BaytMiftah Trust & Verification Policy",
    seoDescription:
      "How BaytMiftah verification features work and what a verification badge does and does not mean.",
    relatedPolicies: ["kyc", "marketplace-rules", "agency-agent-terms"],
    sections: [
      {
        heading: "Possible verification types",
        content: "Depending on the service, verification may include:",
        bullets: [
          "email;",
          "phone;",
          "identity;",
          "business;",
          "document;",
          "property information.",
        ],
      },
      {
        heading: "What verification means",
        content:
          "Verification means only that the applicable verification process has been completed. It does not guarantee honesty, financial capacity, ownership beyond the scope of the check, property condition, future behaviour, or contractual performance.",
      },
      {
        heading: "Due diligence",
        content: "Users remain responsible for appropriate due diligence.",
      },
    ],
  }),
  policy({
    slug: "kyc",
    title: "KYC & Identity Verification Policy",
    category: "trust",
    description:
      "Identity verification is a platform feature for particular features or risk situations. It does not mean BaytMiftah is a financial institution.",
    seoTitle: "BaytMiftah KYC & Identity Verification Policy",
    seoDescription:
      "When BaytMiftah may request identity verification for listings, agencies, business accounts, and platform security.",
    relatedPolicies: ["trust-verification", "aml-sanctions", "privacy"],
    sections: [
      {
        heading: "When verification may be requested",
        content: "BaytMiftah may request identity verification for:",
        bullets: [
          "certain listings;",
          "agencies;",
          "business accounts;",
          "higher-risk activity;",
          "fraud prevention;",
          "platform security;",
          "legal compliance.",
        ],
      },
      {
        heading: "How checks may be performed",
        content:
          "Identity checks may be performed using third-party verification services. Information collected may include legal name, identification information, photograph, address, business information, and other information reasonably necessary for the verification process.",
      },
      {
        heading: "Limitations",
        content:
          "This policy does not imply that BaytMiftah performs regulated banking KYC or that BaytMiftah is a financial institution. Verification is not a guarantee that a user is trustworthy or that all information supplied is accurate.",
      },
    ],
  }),
  policy({
    slug: "aml-sanctions",
    title: "Fraud, AML & Sanctions Policy",
    category: "trust",
    description:
      "BaytMiftah may implement fraud and compliance controls. This policy does not state that BaytMiftah is itself a regulated financial reporting entity.",
    seoTitle: "BaytMiftah Fraud, AML & Sanctions Policy",
    seoDescription:
      "How BaytMiftah may detect fraud, restrict abuse, and cooperate with authorities without claiming to be a regulated financial institution.",
    relatedPolicies: ["payments", "kyc", "terms"],
    sections: [
      {
        heading: "Platform controls, not a licensing claim",
        content:
          "BaytMiftah may implement reasonable measures designed to reduce fraud, unlawful use, sanctions evasion, and misuse of the platform. This policy does not state that BaytMiftah automatically considers itself a regulated financial reporting entity. Where legal obligations apply, BaytMiftah will comply with the applicable requirements.",
      },
      {
        heading: "Measures BaytMiftah may take",
        content: "BaytMiftah may:",
        bullets: [
          "detect fraud;",
          "restrict suspicious accounts;",
          "request information;",
          "investigate abuse;",
          "cooperate with authorities;",
          "retain records where legally required.",
        ],
      },
      {
        heading: "Limitations",
        content:
          "BaytMiftah does not represent that every transaction or user has been independently verified for every possible fraud, AML, or sanctions risk.",
      },
    ],
  }),
  policy({
    slug: "disputes",
    title: "Dispute Resolution Policy",
    category: "trust",
    description:
      "Disputes generally occur between the relevant users. BaytMiftah does not automatically decide property ownership or contractual liability.",
    seoTitle: "BaytMiftah Dispute Resolution Policy",
    seoDescription:
      "How disputes between BaytMiftah users are handled, and the limits of BaytMiftah's role as a technology platform.",
    relatedPolicies: ["payments", "terms", "complaints"],
    sections: [
      {
        heading: "Not automatically a party",
        content:
          "BaytMiftah is not automatically a party to the underlying property transaction. A dispute between a buyer and seller, landlord and tenant, host and guest, owner and agent, or customer and vendor generally remains a dispute between those parties.",
      },
      {
        heading: "What BaytMiftah may provide",
        content: "Where appropriate, BaytMiftah may provide:",
        bullets: [
          "messages;",
          "transaction records;",
          "listing history;",
          "relevant platform evidence;",
          "support.",
        ],
      },
      {
        heading: "Payment disputes",
        content:
          "Questions concerning the processing, authorisation, settlement, reversal, chargeback, or delivery of a payment may involve the applicable payment provider, the relevant bank, card network, mobile-money provider, or other financial institution. BaytMiftah may assist by providing relevant marketplace records and transaction references, but does not independently control the payment infrastructure.",
      },
      {
        heading: "Limits of facilitation",
        content:
          "BaytMiftah may facilitate communication but does not automatically decide property ownership or contractual liability. Nothing in this policy prevents a user from seeking remedies available under applicable law.",
      },
    ],
  }),
  policy({
    slug: "safety",
    title: "Safety",
    category: "trust",
    description:
      "Practical safety guidance for communicating, viewing properties, and authorising payments. BaytMiftah does not guarantee personal safety.",
    seoTitle: "BaytMiftah Safety",
    seoDescription:
      "Safety guidance for BaytMiftah users, including property viewings, payments, identity checks, and reporting fraud.",
    relatedPolicies: ["trust-verification", "complaints", "payments"],
    sections: [
      {
        heading: "No safety guarantee",
        content:
          "Users should exercise appropriate caution when communicating, viewing properties, transferring money, sharing personal information, or entering contracts. BaytMiftah cannot guarantee that every user or listing is safe and does not guarantee personal safety.",
      },
      {
        heading: "Meeting users and viewing properties",
        bullets: [
          "Meet in public or well-attended places for first viewings where possible.",
          "Bring someone you trust to property visits.",
          "Confirm ownership or authority before relying on a listing.",
          "Inspect properties independently.",
        ],
      },
      {
        heading: "Payment safety",
        bullets: [
          "Review the payment recipient and amount before authorising payment.",
          "Avoid suspicious payment requests, especially those that pressure you to pay immediately or off-platform.",
          "Remember that payments are processed by the applicable payment provider, not held by BaytMiftah.",
        ],
      },
      {
        heading: "Identity and suspicious listings",
        bullets: [
          "Use available verification features, understanding they are not guarantees.",
          "Be cautious of listings with unusually low prices, poor documentation, or requests to move communication off the platform immediately.",
          "Report suspected fraud through the complaints process.",
        ],
      },
      {
        heading: "Emergencies",
        content:
          "Contact local emergency services first. Then notify BaytMiftah support so appropriate platform action can be considered.",
      },
    ],
  }),
  policy({
    slug: "non-discrimination",
    title: "Non-Discrimination & Community Standards",
    category: "trust",
    description:
      "Users must not use BaytMiftah to promote unlawful discrimination, harassment, intimidation, hate, or abusive conduct.",
    seoTitle: "BaytMiftah Non-Discrimination & Community Standards",
    seoDescription:
      "BaytMiftah community standards prohibiting unlawful discrimination, harassment, hate, intimidation, and abusive behaviour.",
    relatedPolicies: ["marketplace-rules", "acceptable-use", "property-owner-terms"],
    sections: [
      {
        heading: "Respectful marketplace",
        content: "BaytMiftah is committed to a respectful marketplace. Users must not use BaytMiftah to promote:",
        bullets: [
          "unlawful discrimination;",
          "harassment;",
          "hate;",
          "intimidation;",
          "abusive behaviour.",
        ],
      },
      {
        heading: "Applicable law",
        content:
          "Property owners, landlords, hosts, agents, agencies, tenants, guests, buyers, sellers, and vendors remain responsible for compliance with applicable anti-discrimination and other applicable laws.",
      },
      {
        heading: "Enforcement",
        content:
          "BaytMiftah may remove content or restrict accounts where conduct violates applicable law or platform standards.",
      },
    ],
  }),
  policy({
    slug: "liability",
    title: "Insurance & Liability Disclaimer",
    category: "trust",
    description:
      "BaytMiftah is a technology platform and does not automatically provide insurance. Users are responsible for obtaining appropriate insurance.",
    seoTitle: "BaytMiftah Insurance & Liability Disclaimer",
    seoDescription:
      "BaytMiftah does not automatically provide insurance and does not guarantee property condition, ownership, or investment returns.",
    relatedPolicies: ["marketplace-rules", "host-terms", "terms"],
    sections: [
      {
        heading: "No automatic insurance",
        content:
          "BaytMiftah is a technology platform. BaytMiftah does not automatically provide insurance for properties, tenants, hosts, guests, buyers, sellers, agencies, vendors, or other users. Users are responsible for obtaining insurance appropriate to their circumstances.",
      },
      {
        heading: "No outcome guarantees",
        content: "BaytMiftah does not guarantee:",
        bullets: [
          "property condition;",
          "ownership;",
          "user conduct;",
          "contractual performance;",
          "availability;",
          "profitability;",
          "rental income;",
          "investment returns;",
          "insurance coverage.",
        ],
      },
      {
        heading: "Liability",
        content:
          "BaytMiftah's liability is limited to the extent permitted by applicable law. Nothing in these policies excludes liability that cannot legally be excluded.",
      },
    ],
  }),
  policy({
    slug: "complaints",
    title: "Complaints & Reporting",
    category: "trust",
    description: "How to report fraud, discrimination, privacy concerns, and other policy violations.",
    seoTitle: "BaytMiftah Complaints & Reporting",
    seoDescription:
      "Report fraudulent listings, harassment, privacy concerns, and other BaytMiftah policy violations.",
    relatedPolicies: ["disputes", "copyright", "safety"],
    showComplaintForm: true,
    sections: [
      {
        heading: "What you can report",
        content: "Users can report:",
        bullets: [
          "fraudulent listing;",
          "impersonation;",
          "unsafe behaviour;",
          "harassment;",
          "discrimination;",
          "IP violation;",
          "privacy concern;",
          "suspicious activity;",
          "account abuse;",
          "inaccurate listing.",
        ],
      },
      {
        heading: "How to contact us",
        content: `Complaints may be sent to ${LEGAL_CONTACT.complaints}. You may also use the form on this page. BaytMiftah may request evidence and additional information necessary to investigate a complaint.`,
      },
    ],
  }),
  policy({
    slug: "copyright",
    title: "Copyright & Intellectual Property Policy",
    category: "ip-data",
    description: "Rights in uploaded content and how to report intellectual-property infringement.",
    seoTitle: "BaytMiftah Copyright & Intellectual Property Policy",
    seoDescription:
      "How BaytMiftah handles user-uploaded content and intellectual-property complaints.",
    relatedPolicies: ["terms", "acceptable-use"],
    sections: [
      {
        heading: "User content",
        content:
          "Users must own or have permission to upload photographs, videos, documents, logos, descriptions, and other materials. Users retain ownership of their content. By uploading content, users grant BaytMiftah the limited rights reasonably necessary to host, display, reproduce, process, distribute, and make that content available through the platform.",
      },
      {
        heading: "Reporting infringement",
        content: `BaytMiftah may remove content where it receives a credible infringement complaint or otherwise reasonably believes that content violates applicable law or platform policies. Copyright and other intellectual-property complaints may be submitted to ${LEGAL_CONTACT.legal}.`,
      },
    ],
  }),
  policy({
    slug: "data-processing",
    title: "Data Processing Agreement",
    category: "ip-data",
    description:
      "Applies where BaytMiftah and a business customer have a relationship in which one party processes personal data on behalf of the other.",
    seoTitle: "BaytMiftah Data Processing Agreement",
    seoDescription:
      "Data processing terms for agencies and business customers using BaytMiftah, including security, subprocessors, and incident assistance.",
    relatedPolicies: ["privacy", "agency-agent-terms"],
    sections: [
      {
        heading: "When this agreement applies",
        content:
          "This Data Processing Agreement supports agency and business customers that process personal information through BaytMiftah. It applies only where BaytMiftah and a business customer have a relationship in which one party processes personal data on behalf of the other. The parties' controller/processor roles depend on the actual processing activity and agreement.",
      },
      {
        heading: "Where BaytMiftah acts as a processor",
        content: "Where BaytMiftah acts as a processor, the applicable agreement may cover:",
        bullets: [
          "instructions;",
          "security;",
          "confidentiality;",
          "subprocessors;",
          "assistance;",
          "deletion/return;",
          "data incidents.",
        ],
      },
      {
        heading: "Independent platform purposes",
        content:
          "BaytMiftah may also process information for its own independent platform purposes, such as operating accounts, securing the marketplace, and complying with law.",
      },
    ],
  }),
  policy({
    slug: "accessibility",
    title: "Accessibility Statement",
    category: "ip-data",
    description: "BaytMiftah's commitment to an accessible digital experience.",
    seoTitle: "BaytMiftah Accessibility Statement",
    seoDescription:
      "How BaytMiftah works toward accessible navigation, forms, contrast, keyboard interaction, and assistive technologies.",
    relatedPolicies: ["terms"],
    sections: [
      {
        heading: "Commitment",
        content: "BaytMiftah aims to provide an accessible digital experience. We work toward accessibility across:",
        bullets: [
          "accessible navigation;",
          "forms;",
          "typography;",
          "contrast;",
          "keyboard interaction;",
          "mobile usability;",
          "assistive technologies.",
        ],
      },
      {
        heading: "Limitations and feedback",
        content: `Third-party services and user-generated content may not always be fully accessible. Accessibility concerns can be sent to ${LEGAL_CONTACT.accessibility}.`,
      },
    ],
  }),
  policy({
    slug: "whitelabel",
    title: "Whitelabel & B2B Partner Terms",
    category: "business",
    description:
      "Technology services for agencies, developers, property managers, and other partners. The partner remains responsible for its own business activities.",
    seoTitle: "BaytMiftah Whitelabel & B2B Partner Terms",
    seoDescription:
      "Terms for branded workspaces, APIs, and B2B technology services provided by BaytMiftah.",
    relatedPolicies: ["agency-agent-terms", "data-processing", "fees"],
    sections: [
      {
        heading: "Services",
        content: "BaytMiftah may provide technology services including:",
        bullets: [
          "branded workspaces;",
          "domains;",
          "dashboards;",
          "listing management;",
          "CRM;",
          "reporting;",
          "APIs;",
          "team features.",
        ],
      },
      {
        heading: "Partner responsibility",
        content:
          "The partner remains responsible for its own business activities, customers, employees, listings, representations, transactions, and regulatory obligations. Use of BaytMiftah technology does not make BaytMiftah the partner's agent, broker, landlord, property manager, or payment institution.",
      },
    ],
  }),
];
