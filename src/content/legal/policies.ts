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
  policy({
    slug: "age-minor-protection",
    title: "Minor & Legal Capacity Protection",
    category: "general",
    description:
      "BaytMiftah may restrict account use and transactional capabilities based on legal capacity, local law, and jurisdiction-specific safeguards.",
    seoTitle: "BaytMiftah Minor & Legal Capacity Protection",
    seoDescription:
      "BaytMiftah rules for minimum account age, legal capacity, local law, and restricted capabilities for minors and other protected users.",
    relatedPolicies: ["terms", "kyc", "privacy-rights", "communications-marketing"],
    sections: [
      {
        heading: "Legal capacity and account access",
        content:
          "BaytMiftah may require users to have the legal capacity required to enter into agreements or carry out the transaction type they are attempting to access. Transactional features may require legal capacity in addition to identity verification and account controls. Local law may impose different thresholds, and BaytMiftah may restrict account capabilities by jurisdiction.",
      },
      {
        heading: "Minors and protected persons",
        content:
          "Minors or other persons with restricted legal capacity may not be able to create accounts, complete some transactions, sign certain documents, or receive some marketing or payment-related features unless a lawful guardian or representative is authorised and the workflow is supported by local law. BaytMiftah does not assume a universal minimum age of 18 for every jurisdiction.",
      },
      {
        heading: "Contracting and property restrictions",
        bullets: [
          "property, lease, and signing workflows may require legal capacity and jurisdiction-specific review;",
          "payment or wallet features may be restricted where local law or identity verification does not support the workflow;",
          "guarantees or acting as a representative may require evidence of authority and separate review;",
          "child or dependent household information should be limited to the minimum necessary and only where lawful and operationally required.",
        ],
      },
      {
        heading: "Age verification and data minimisation",
        content:
          "Where age or capacity checks are needed, BaytMiftah may request identity information or other supporting evidence and may limit access until the check is complete. BaytMiftah does not treat legal copy alone as an authority to transact on behalf of a minor or other protected person.",
      },
    ],
  }),
  policy({
    slug: "biometric-identity-data",
    title: "Biometric Identity Data Notice",
    category: "trust",
    description:
      "Identity documents, liveness checks, selfie comparison, and biometric verification may be processed only for clearly defined KYC or security workflows.",
    seoTitle: "BaytMiftah Biometric Identity Data Notice",
    seoDescription:
      "Notice about document-based identity verification, biometric checks, human review, retention, and limits for KYC and fraud-prevention processing.",
    relatedPolicies: ["kyc", "privacy", "privacy-rights"],
    sections: [
      {
        heading: "What this includes",
        content: "Depending on the workflow, BaytMiftah may process identity-document data, self-portraits, liveness checks, face comparisons, and related identity-provider outputs for fraud prevention, KYC, and account integrity. This is distinct from a device biometric app lock or local biometric authentication on a user device.",
      },
      {
        heading: "Purposes and controls",
        bullets: [
          "verify a user's identity for selected marketplace or trust workflows;",
          "support fraud prevention, account integrity, and suspicious-activity investigations;",
          "support human review where automated checks raise a risk or exception;",
          "support lawful onboarding, property, and screening related approval workflows where applicable;",
          "comply with lawful retention, deletion, or legal hold requirements where applicable.",
        ],
      },
      {
        heading: "Limits and rights",
        content:
          "BaytMiftah does not claim a biometric vault, ISO certification, or legal compliance for all biometric processing by default. Biometric processing is subject to the applicable workflow, jurisdiction, data minimisation, human review, and lawful retention rules. Users may have rights to request access, correction, withdrawal of consent, or deletion where applicable law and operational constraints allow.",
      },
      {
        heading: "Sharing and human review",
        content:
          "Biometric or identity-document data may be shared with approved identity verification providers or internal staff engaged in fraud and trust review. Automated matches are advisory and may be subject to false-positive or false-negative error. High-risk outcomes should be reviewed by a human before final action where required by policy or law.",
      },
    ],
  }),
  policy({
    slug: "tenant-screening",
    title: "Tenant Screening Policy",
    category: "trust",
    description:
      "Tenant screening may include identity, income, affordability, rental history, and other checks when permitted by law and the party's consent.",
    seoTitle: "BaytMiftah Tenant Screening Policy",
    seoDescription:
      "Information about screening purposes, consent, provider involvement, review, and rights in tenant or applicant assessments.",
    relatedPolicies: ["kyc", "privacy-rights", "terms"],
    sections: [
      {
        heading: "Purpose and scope",
        content:
          "BaytMiftah may support screening workflows for landlords, agencies, or applicants, including identity validation, affordability checks, rental-history information, and other relevant applicant data where lawful and authorised. Tenant-screening support is not automatically the same as a regulated credit-reporting service and may vary by jurisdiction, provider, and workflow.",
      },
      {
        heading: "Applicant consent and review",
        bullets: [
          "applicant consent is required for the applicable screening workflow and should be explicit and specific;",
          "screening providers may process data under their own terms and may have separate rights and dispute processes;",
          "human review is required where a result may materially affect an application or decision;",
          "discrimination safeguards, data correction, and fair treatment must be respected in any decisioning process.",
        ],
      },
      {
        heading: "Adverse action and dispute",
        content:
          "Where a screening result is used to make a material decision, affected parties may be entitled to notice, review, and dispute rights under local law. BaytMiftah does not treat any screening output as guaranteed accuracy or as a substitute for legal counsel or an adverse-action process required by local law. BaytMiftah does not impose U.S.-specific FCRA procedures globally.",
      },
    ],
  }),
  policy({
    slug: "ai-automated-decisions",
    title: "AI-Assisted Decision Support",
    category: "trust",
    description:
      "AI output is advisory unless a workflow specifically states otherwise. Human review remains required for high-impact decisions.",
    seoTitle: "BaytMiftah AI-Assisted Decision Support",
    seoDescription:
      "Notice about AI features in BaytMiftah, advisory nature of outputs, required human oversight, and limits on automated decision-making.",
    relatedPolicies: ["terms", "privacy", "valuation-disclaimer", "tenant-screening"],
    sections: [
      {
        heading: "Scope",
        content:
          "BaytMiftah may use AI features for assistant support, document review, lease analysis, rent and yield estimates, collections recommendations, maintenance triage, fraud assistance, tenant-screening support, and related recommendations. AI output is advisory unless a specific workflow explicitly provides otherwise.",
      },
      {
        heading: "Human oversight",
        bullets: [
          "high-impact decisions should include human review, especially where a result affects a property transaction, financial decision, legal document, adverse action, or safety matter;",
          "AI output may be incomplete, stale, or incorrect;",
          "model providers may receive limited prompt, file, or context data necessary to operate the feature;",
          "users should challenge or verify important outputs before acting on them.",
        ],
      },
      {
        heading: "Prohibited autonomous decisions",
        content:
          "BaytMiftah does not present AI as a substitute for legal advice, professional valuation, or an autonomous decision-maker for regulated or high-impact outcomes. Final decision-making power remains with the relevant human party or workflow owner unless a separate controlling process states otherwise.",
      },
    ],
  }),
  policy({
    slug: "communications-marketing",
    title: "Communications & Marketing Consent",
    category: "general",
    description:
      "BaytMiftah distinguishes transactional, security, and legal communications from marketing communications and promotional messaging.",
    seoTitle: "BaytMiftah Communications & Marketing Consent",
    seoDescription:
      "How BaytMiftah manages email, SMS, WhatsApp, push notifications, transaction alerts, marketing communications, and consent preferences.",
    relatedPolicies: ["privacy", "terms", "cookies", "privacy-rights"],
    sections: [
      {
        heading: "Communication categories",
        content: "BaytMiftah may send transactional communications, security alerts, account notices, service updates, and marketing communications. These are not all treated as the same category for consent or legal necessity.",
      },
      {
        heading: "Marketing consent",
        content:
          "Marketing communications require separate consent or valid opt-in where required by law. Accepting the Terms or creating an account does not automatically constitute marketing consent. BaytMiftah will maintain preference-management controls where supported.",
      },
      {
        heading: "Service notifications",
        bullets: [
          "service, security, fraud, and legal notices may still be required despite a marketing opt-out;",
          "users may receive account-related updates, security notices, and operational communications necessary for the service;",
          "unsubscribe or preference controls apply to marketing categories where the service supports them.",
        ],
      },
    ],
  }),
  policy({
    slug: "privacy-rights",
    title: "Privacy Rights & Request Handling",
    category: "general",
    description:
      "Users may request access, correction, deletion, objection, restriction, export, or consent withdrawal where the relevant law and system configuration permit.",
    seoTitle: "BaytMiftah Privacy Rights & Request Handling",
    seoDescription:
      "How BaytMiftah receives and handles privacy requests, identity verification, legal retention limits, and complaint handling.",
    relatedPolicies: ["privacy", "data-retention", "complaints"],
    sections: [
      {
        heading: "Request types",
        content: "Depending on applicable law and system configuration, users may ask for access to personal information, correction of inaccurate records, export of their data, deletion or restriction of processing, objection to processing, or withdrawal of consent. Requests may require identity verification to avoid security or privacy harm.",
      },
      {
        heading: "Limitations",
        bullets: [
          "some records cannot be deleted or fully removed where legal retention, accounting, fraud, or litigation obligations apply;",
          "legal holds, security records, and evidence may remain in protected systems;",
          "timelines vary by jurisdiction, data category, and implementation status;",
          "BaytMiftah may respond to requests within the timeframe required by law and the applicable operational process.",
        ],
      },
      {
        heading: "Complaint process",
        content: "Users may also raise concerns through the complaints workflow or privacy contact address. BaytMiftah may request additional information to verify the requestor and to understand whether the issue is operational, legal, or security-related.",
      },
    ],
  }),
  policy({
    slug: "data-retention",
    title: "Data Retention & Deletion Policy",
    category: "general",
    description:
      "Retention periods vary by data category, jurisdiction, transaction status, legal claims, accounting obligations, security needs, and system configuration.",
    seoTitle: "BaytMiftah Data Retention & Deletion Policy",
    seoDescription:
      "Retention rules for account data, KYC, leases, payments, support records, screening data, visitor logs, and legal hold records.",
    relatedPolicies: ["privacy", "privacy-rights", "legal-hold"],
    sections: [
      {
        heading: "Retention by category",
        content: "BaytMiftah may keep different categories of information for different periods depending on product use, transaction status, legal claims, regulatory obligations, and operational needs. Data categories may include account data, KYC or identity data, leases and contracts, messages, listing records, visitor access logs, IoT or security logs, screening data, complaints, tax and accounting evidence, support data, and backups.",
      },
      {
        heading: "Legal hold and deletion",
        bullets: [
          "records relevant to active disputes, investigations, audits, or legal claims may be retained longer;",
          "deletion may be deferred where legal holds or security needs require preservation;",
          "retention may vary by jurisdiction, data category, and system configuration;",
          "BaytMiftah does not state a single global retention period for all categories.",
        ],
      },
    ],
  }),
  policy({
    slug: "international-data-transfers",
    title: "International Data Transfers",
    category: "general",
    description:
      "BaytMiftah may process personal data across regions using approved service providers and documented transfer mechanisms where required by applicable law.",
    seoTitle: "BaytMiftah International Data Transfers",
    seoDescription:
      "Rules for cross-border processing, service-provider transfers, and jurisdiction-aware transfer safeguards.",
    relatedPolicies: ["privacy", "subprocessors", "data-processing"],
    sections: [
      {
        heading: "Cross-border processing",
        content:
          "BaytMiftah may transfer personal data to cloud vendors, support providers, verification services, and other processors located in different regions when necessary for platform operations. Whether a particular transfer is subject to an adequacy mechanism, contractual safeguard, or other legal basis depends on the actual location, recipient, and applicable law.",
      },
      {
        heading: "Customer responsibilities",
        bullets: [
          "business customers remain responsible for their own international data-transfer decisions and contracts where applicable;",
          "customers should review data residency and transfer requirements for their own jurisdictions;",
          "BaytMiftah does not claim a single global transfer mechanism for all product deployments.",
        ],
      },
    ],
  }),
  policy({
    slug: "subprocessors",
    title: "Subprocessors & Service Providers",
    category: "general",
    description:
      "A current list of providers and service categories used in BaytMiftah production environments, where applicable and deployment-dependent.",
    seoTitle: "BaytMiftah Subprocessors & Service Providers",
    seoDescription:
      "How BaytMiftah documents processing providers, service categories, and deployment-dependent providers used for infrastructure, verification, or support.",
    relatedPolicies: ["privacy", "data-processing", "international-data-transfers"],
    sections: [
      {
        heading: "Structured provider register",
        content: "The list below is illustrative and deployment-dependent. Service providers and processing regions may vary by product environment and customer configuration. Providers should be identified in the actual deployment record rather than assumed globally.",
      },
      {
        heading: "Example entries",
        bullets: [
          "Supabase — authentication, database, storage, and edge infrastructure — deployment-dependent — status: supported;",
          "Cloud hosting provider — app hosting and infrastructure — deployment-dependent — status: supported;",
          "Payment provider — payment routing and transaction status — deployment-dependent — status: user-specific;",
          "Identity verification provider — KYC and document checks — deployment-dependent — status: workflow-specific;",
          "Email, SMS, WhatsApp, or push provider — communications and notifications — deployment-dependent — status: supported where enabled.",
        ],
      },
    ],
  }),
  policy({
    slug: "developer-api-terms",
    title: "Developer API Terms",
    category: "payments",
    description:
      "API access requires credential confidentiality, scope control, security practices, and compliance with platform usage rules.",
    seoTitle: "BaytMiftah Developer API Terms",
    seoDescription:
      "API credential rules, rate limits, hub security, webhook requirements, abuse controls, and downstream privacy responsibilities for developers.",
    relatedPolicies: ["terms", "privacy", "acceptable-use"],
    sections: [
      {
        heading: "Credential and scope controls",
        content:
          "API credentials must be kept confidential and used only within the authorised scope. Developers must not share keys, impersonate other parties, misuse data, or bypass authentication or rate limits. BaytMiftah may suspend or restrict API access where abuse, security risk, or a policy violation is identified.",
      },
      {
        heading: "Privacy and downstream data handling",
        bullets: [
          "developers are responsible for recipient consent and lawful downstream use of data obtained through BaytMiftah APIs;",
          "webhooks, integrations, and exported data must be secured and only used for the purpose for which access was granted;",
          "scraping, reverse engineering, and impersonation are prohibited;",
          "BaytMiftah does not guarantee uninterrupted availability or performance.",
        ],
      },
    ],
  }),
  policy({
    slug: "smart-access-security",
    title: "Smart Access & Visitor Security",
    category: "trust",
    description:
      "BaytMiftah may support smart locks, visitor passes, access logs, and other secure-access workflows. These tools are operational controls, not guarantees of physical security.",
    seoTitle: "BaytMiftah Smart Access & Visitor Security",
    seoDescription:
      "Access-control and visitor-pass rules for BaytMiftah smart property workflows, including logs, retention, staff access, and limits of physical-security guarantees.",
    relatedPolicies: ["privacy", "location-data", "terms"],
    sections: [
      {
        heading: "Access system scope",
        content:
          "BaytMiftah may provide software for smart locks, visitor passes, IoT devices, credential workflows, access logs, and staff-admin tools. These features support access control but do not guarantee physical security or a valid authorization beyond the configured property system.",
      },
      {
        heading: "Visitor and device data",
        bullets: [
          "visitor names, vehicle plates, access times, and staff review are operational data that may be retained under security and legal obligations;",
          "credential rotation, emergency access, and staff-user control should be configured according to the property workflow;",
          "BaytMiftah may provide access status information, but users remain responsible for on-site security arrangements and site procedures.",
        ],
      },
    ],
  }),
  policy({
    slug: "location-data",
    title: "Location Data Notice",
    category: "trust",
    description:
      "Location services may be used for field operations, inspections, map/search personalization, fraud mitigation, and security-related workflows when permitted by law.",
    seoTitle: "BaytMiftah Location Data Notice",
    seoDescription:
      "How BaytMiftah processes location data, approximate or precise geolocation, and the limits of GPS accuracy and authorization.",
    relatedPolicies: ["privacy", "smart-access-security", "terms"],
    sections: [
      {
        heading: "When location may be processed",
        content:
          "BaytMiftah may process approximate or precise location data for map features, field operations, inspections, maintenance requests, fraud or security review, and service access. Use is limited to the purposes for which permission or operational necessity is established and will vary by jurisdiction and feature.",
      },
      {
        heading: "Accuracy and access",
        bullets: [
          "user-reported or device-derived location data may be inaccurate or incomplete;",
          "staff access to location data should be restricted to the minimum necessary for support, security, or service operations;",
          "location data is not a guarantee of the user's actual physical location or the accuracy of any claim made by a user.",
        ],
      },
    ],
  }),
  policy({
    slug: "valuation-disclaimer",
    title: "Valuation & Estimate Disclaimer",
    category: "trust",
    description:
      "Rent, yield, and property estimates are market estimates only and are not formal valuations, expert advice, or financing approvals.",
    seoTitle: "BaytMiftah Valuation & Estimate Disclaimer",
    seoDescription:
      "Important limits on rent, yield, occupancy, and property estimates produced through BaytMiftah's tools and data models.",
    relatedPolicies: ["ai-automated-decisions", "terms", "liability"],
    sections: [
      {
        heading: "No certified appraisal",
        content:
          "BaytMiftah may provide rent estimates, yield estimates, price estimates, occupancy projections, and other market indicators. These are informational estimates only. They are not certified appraisals, formal valuations, tax advice, investment advice, or financing approval. Market conditions, data quality, and property-specific factors may materially change the result.",
      },
      {
        heading: "Use with professional advice",
        bullets: [
          "independent professional valuation is recommended for material transactions or financing decisions;",
          "estimates may be stale or incomplete;",
          "AI or model outputs remain advisory and should not be treated as guaranteed returns or guaranteed market outcomes.",
        ],
      },
    ],
  }),
  policy({
    slug: "tax-accounting-disclaimer",
    title: "Tax & Accounting Disclaimer",
    category: "payments",
    description:
      "BaytMiftah workflows may calculate or summarise financial information, but they are not professional tax, legal, or accounting advice.",
    seoTitle: "BaytMiftah Tax & Accounting Disclaimer",
    seoDescription:
      "Limitations on tax calculations, bookkeeping, reconciliation, and financial summaries in BaytMiftah workflows.",
    relatedPolicies: ["payments", "terms", "professional-credentials"],
    sections: [
      {
        heading: "No professional advice",
        content:
          "BaytMiftah may display or generate accounting, tax, rent, ledger, reconciliation, or statement-related calculations in support of transactions or operations. These calculations are informational and workflow-specific. They do not constitute professional tax, legal, or accounting advice and should not be relied on as the sole basis for a legal or tax decision. Jurisdiction-specific obligations and professional requirements may vary.",
      },
      {
        heading: "User responsibility",
        bullets: [
          "users remain responsible for verifying tax treatment, VAT, withholding, contractor reporting, and accounting requirements in their own jurisdiction;",
          "owners, agents, and businesses should consult qualified professionals where the subject matter is material;",
          "BaytMiftah does not guarantee compliance or tax outcomes.",
        ],
      },
    ],
  }),
  policy({
    slug: "professional-credentials",
    title: "Professional Credential Disclosure",
    category: "participants",
    description:
      "Professional credential badges may describe only the exact verification or review performed and must not imply greater certainty than the evidence supports.",
    seoTitle: "BaytMiftah Professional Credential Disclosure",
    seoDescription:
      "How BaytMiftah describes credential, license, identity, insurance, and ownership-verification badges for agents, brokers, vendors, and professionals.",
    relatedPolicies: ["agency-agent-terms", "vendor-terms", "trust-verification"],
    sections: [
      {
        heading: "Badge meanings",
        content: "Where BaytMiftah displays credential badges, the badge should clearly describe the review performed. Examples may include: identity checked, business documents reviewed, license verified, insurance verified, and ownership evidence reviewed. Generic 'Verified' should not imply more than the underlying evidence supports.",
      },
      {
        heading: "Limitations",
        bullets: [
          "credential review is point-in-time and may be limited to a specific checklist or jurisdiction;",
          "expiry dates, verification status, and jurisdiction-specific scope must be visible where relevant;",
          "verification does not by itself guarantee professional conduct or underlying legal compliance.",
        ],
      },
    ],
  }),
  policy({
    slug: "account-enforcement-appeals",
    title: "Account Enforcement & Appeals",
    category: "trust",
    description:
      "BaytMiftah may suspend or restrict accounts and listings for fraud, compliance, safety, or policy reasons, with an appeal and review process.",
    seoTitle: "BaytMiftah Account Enforcement & Appeals",
    seoDescription:
      "Account restrictions, listing removals, KYC restrictions, emergency actions, notices, and review procedures for users subject to enforcement.",
    relatedPolicies: ["terms", "complaints", "kyc", "safety"],
    sections: [
      {
        heading: "Enforcement actions",
        content: "BaytMiftah may suspend, restrict, or terminate an account, listing, feature, or workflow where there is a material risk of fraud, legal breach, security harm, reputational risk, or other necessary enforcement reason. This may include KYC restrictions, content removal, feature restrictions, or emergency action where needed to protect the platform or users.",
      },
      {
        heading: "Appeals and review",
        bullets: [
          "users should be able to request review within the process identified by BaytMiftah;",
          "urgent or emergency actions may be taken before a full review when necessary to mitigate immediate risk;",
          "the review process should document the reason, evidence considered, and any reinstatement conditions;",
          "reinstatement is not guaranteed and depends on the facts and applicable policy.",
        ],
      },
    ],
  }),
  policy({
    slug: "content-moderation",
    title: "Content Moderation & Reporting",
    category: "trust",
    description:
      "BaytMiftah may remove or restrict fake listings, misleading content, impersonation, scams, harassment, threatening content, or illegal content.",
    seoTitle: "BaytMiftah Content Moderation & Reporting",
    seoDescription:
      "Moderation rules for fake listings, scams, hate or abusive content, defamatory allegations, and reporting and appeal pathways.",
    relatedPolicies: ["acceptable-use", "copyright", "complaints"],
    sections: [
      {
        heading: "Moderation examples",
        bullets: [
          "fake listings;",
          "misleading claims;",
          "impersonation;",
          "scams;",
          "harassment;",
          "threatening content;",
          "discriminatory content;",
          "defamatory allegations;",
          "illegal content;",
          "retaliatory or abusive reviews.",
        ],
      },
      {
        heading: "Reporting and appeals",
        content: "Users may report content or conduct through the complaints workflow. BaytMiftah may remove content while investigating, and users may have a review path where appropriate. Moderation actions are not a determination of legal guilt and do not prevent other legal remedies.",
      },
    ],
  }),
  policy({
    slug: "reasonable-accommodation",
    title: "Reasonable Accommodation Requests",
    category: "trust",
    description:
      "BaytMiftah will consider accessibility and accommodation requests in a respectful, privacy-aware, and human-reviewed process.",
    seoTitle: "BaytMiftah Reasonable Accommodation Requests",
    seoDescription:
      "How BaytMiftah handles accessibility-related requests, communication accommodations, service animal or support needs, and privacy safeguards.",
    relatedPolicies: ["accessibility", "privacy-rights", "terms"],
    sections: [
      {
        heading: "What may be requested",
        content:
          "Users may request communication accommodations, accessibility improvements, support with application workflows, or other reasonable adjustments relevant to housing or product access. BaytMiftah may consider support needs connected to disability or other protected circumstances under applicable law. Information should be limited to what is necessary to evaluate the request.",
      },
      {
        heading: "Privacy and review",
        bullets: [
          "supporting information should be limited to what is necessary;",
          "sensitive medical or disability information should be handled with care, on a minimum-necessary basis;",
          "human review is required for accommodation decisions where such review is relevant;",
          "jurisdiction-specific housing or anti-discrimination obligations may apply.",
        ],
      },
    ],
  }),
  policy({
    slug: "protected-contact-safety",
    title: "Protected Contact & Safety Notices",
    category: "trust",
    description:
      "BaytMiftah may support protected-contact and safety flags for vulnerable users, with restricted visibility and care around communications.",
    seoTitle: "BaytMiftah Protected Contact & Safety Notices",
    seoDescription:
      "How BaytMiftah handles confidential contact details, emergency privacy flags, safe communication preferences, and restricted staff visibility.",
    relatedPolicies: ["privacy", "safety", "communications-marketing"],
    sections: [
      {
        heading: "Safety and privacy controls",
        content:
          "Where a user has a domestic violence, stalking, or other immediate safety concern, BaytMiftah may support protected-contact safeguards, safe communication preferences, or restricted visibility controls. These controls should be handled confidentially and not exposed broadly to other users or staff beyond those with a valid need to know.",
      },
      {
        heading: "Operational limits",
        bullets: [
          "the existence or reason for a protected-contact flag should not be exposed broadly;",
          "staff access should be role-based and need-to-know;",
          "notifications can be suppressed or directed to safer channels where appropriate;",
          "these controls do not guarantee immediate protection from third parties or physical danger.",
        ],
      },
    ],
  }),
  policy({
    slug: "business-saas-terms",
    title: "Business SaaS & Customer Terms",
    category: "payments",
    description:
      "Terms for business customers, workspace operators, agencies, and enterprise-beta accounts using BaytMiftah software and support features.",
    seoTitle: "BaytMiftah Business SaaS & Customer Terms",
    seoDescription:
      "Subscription, billing, administrator responsibilities, support, data export, suspension, and service-change terms for business SaaS customers.",
    relatedPolicies: ["whitelabel", "data-processing", "privacy-rights"],
    sections: [
      {
        heading: "Customer and admin responsibilities",
        content:
          "Business customers and workspace admins remain responsible for their user roster, configuration choices, their own customer data, and lawful use of BaytMiftah tools. Certain enterprise workflows may require additional service and data-processing agreements.",
      },
      {
        heading: "Availability and changes",
        bullets: [
          "service changes and feature rollouts may occur without a guarantee of uninterrupted service;",
          "BaytMiftah does not promise an SLA unless a separate written SLA exists;",
          "suspension, termination, and export rights depend on the applicable contract and product configuration.",
        ],
      },
    ],
  }),
  policy({
    slug: "service-support",
    title: "Service Support & Maintenance Policy",
    category: "payments",
    description:
      "Support channels, incident handling, maintenance windows, and response targets are operational and depend on the support plan or service arrangement.",
    seoTitle: "BaytMiftah Service Support & Maintenance Policy",
    seoDescription:
      "Notice about support channels, severity categories, incident handling, maintenance planning, and support exclusions for BaytMiftah products.",
    relatedPolicies: ["business-saas-terms", "terms", "privacy"],
    sections: [
      {
        heading: "Support availability",
        content: "Support availability depends on the support plan, channel, and service arrangement in effect. BaytMiftah may offer email, in-app help, and service channels for incident reporting, onboarding, or operational support. Response targets are not guaranteed unless separately specified in a customer agreement or support plan.",
      },
      {
        heading: "Outages and exclusions",
        bullets: [
          "third-party outages or external dependencies may affect service resilience;",
          "maintenance windows and incident priorities vary by plan and environment;",
          "service exclusions and availability disclaimers should be reviewed in the applicable contract or support schedule.",
        ],
      },
    ],
  }),
  policy({
    slug: "debt-collection",
    title: "Debt Collection & Recovery Communications",
    category: "general",
    description:
      "Where an overdue amount is associated with a platform-supported transaction, BaytMiftah may send overdue reminders or coordinate collection steps only under the applicable contract, provider terms, and local law.",
    seoTitle: "BaytMiftah Debt Collection & Recovery Communications",
    seoDescription:
      "Notice about overdue-amount reminders, collection steps, provider involvement, and local-law limits for unpaid balances or account obligations.",
    relatedPolicies: ["payments", "refunds", "disputes", "privacy"],
    sections: [
      {
        heading: "Scope",
        content:
          "BaytMiftah may facilitate reminders, notices, dispute routing, or recovery communications for amounts owed under a supported transaction, subscription, provider arrangement, or customer agreement. Collection actions depend on the actual contract, payment provider, and local law.",
      },
      {
        heading: "Limits",
        bullets: [
          "BaytMiftah does not automatically become a debt collector, landlord, or credit provider for all transactions;",
          "recovery steps must comply with the applicable law, contract, provider terms, and communication rules;",
          "disputed amounts must be reviewed before pressure tactics, credit reporting, or escalation steps are taken.",
        ],
      },
    ],
  }),
  policy({
    slug: "short-stay-terms",
    title: "Short-Stay Host & Guest Terms",
    category: "general",
    description:
      "Short-stay bookings are subject to host, guest, and platform rules. BaytMiftah is not the property operator merely because it supports booking workflows.",
    seoTitle: "BaytMiftah Short-Stay Host & Guest Terms",
    seoDescription:
      "Rules for short-stay listings, guest bookings, host duties, local compliance, and limits on BaytMiftah's role in accommodation operations.",
    relatedPolicies: ["terms", "host-terms", "tenant-guest-rules", "disputes"],
    sections: [
      {
        heading: "Operational role",
        content:
          "BaytMiftah may support listing, enquiry, booking, collection, messaging, check-in communications, and review workflows for short-stay accommodation. It is a technology provider and marketplace platform, not the host, operator, landlord, or accommodation manager unless a separate agreement states otherwise.",
      },
      {
        heading: "Host and guest obligations",
        bullets: [
          "hosts remain responsible for property condition, suitability, access, safety, and local accommodation obligations;",
          "guests remain responsible for compliance with house rules, check-in instructions, and applicable law;",
          "short-stay activity may be subject to local licensing, levy, occupancy, tax, and zoning obligations.",
        ],
      },
    ],
  }),
  policy({
    slug: "subscription-billing",
    title: "Subscription Billing & Renewal Terms",
    category: "general",
    description:
      "Business, workspace, and premium subscription charges are governed by the applicable plan, renewal terms, and payment-provider rules.",
    seoTitle: "BaytMiftah Subscription Billing & Renewal Terms",
    seoDescription:
      "Billing, auto-renewal, cancellation, price-change, and payment-notice terms for BaytMiftah subscriptions and SaaS plans.",
    relatedPolicies: ["payments", "fees", "business-saas-terms", "terms"],
    sections: [
      {
        heading: "Billing and renewals",
        content:
          "Subscriptions may recur automatically unless the user cancels before the renewal window and the applicable plan terms allow cancellation. BaytMiftah may change pricing or plan features only in accordance with the current agreement and any notice requirements stated at the time of purchase.",
      },
      {
        heading: "Cancellation and disputes",
        bullets: [
          "users should review renewal and cancellation terms before enabling recurring billing;",
          "unsupported or abnormal charges should be disputed through the payment-dispute channel and the applicable provider;",
          "BaytMiftah does not guarantee that all amounts are refundable or that any charge is waived without a documented review.",
        ],
      },
    ],
  }),
  policy({
    slug: "payment-disputes",
    title: "Payment Disputes & Chargeback Handling",
    category: "general",
    description:
      "Disputes, chargebacks, or payment conflicts must be handled through documented evidence, contract review, and the applicable provider process.",
    seoTitle: "BaytMiftah Payment Disputes & Chargeback Handling",
    seoDescription:
      "How BaytMiftah handles payment disputes, reversible transactions, evidence requests, and chargeback reviews in supported workflows.",
    relatedPolicies: ["payments", "refunds", "debt-collection", "disputes"],
    sections: [
      {
        heading: "Dispute process",
        content:
          "Users who dispute a charge should provide the transaction context, evidence, and relevant contract information required to assess the payment. BaytMiftah may investigate the transaction, request supporting documentation, and coordinate with the relevant payment provider or legal owner where permitted.",
      },
      {
        heading: "Evidence and limits",
        bullets: [
          "charges may be contested through the payment provider's process where the provider terms and bank or card rules apply;",
          "BaytMiftah is not a guarantor of a transaction outcome and may not be able to reverse a payment if the processor denies the request;",
          "unresolved disputes should be treated as operational and legal matter requiring review and not as automatic waivers or refunds.",
        ],
      },
    ],
  }),
  policy({
    slug: "beneficial-ownership",
    title: "Beneficial Ownership & Corporate Verification",
    category: "general",
    description:
      "Businesses and organizations may need to disclose beneficial owners, control persons, and authority details where a workflow requires due diligence or compliance review.",
    seoTitle: "BaytMiftah Beneficial Ownership & Corporate Verification",
    seoDescription:
      "Requirements for beneficial-ownership disclosure, authority review, and compliance checks for business and organization accounts.",
    relatedPolicies: ["business-saas-terms", "kyc", "professional-credentials", "privacy"],
    sections: [
      {
        heading: "Purpose",
        content:
          "BaytMiftah may request information about beneficial owners, controlling persons, business authority, and onboarding records for business accounts, workspace deployments, and selected compliance workflows. Whether this information is required depends on the product, jurisdiction, and legal obligations applicable to the relevant operator.",
      },
      {
        heading: "Review limits",
        bullets: [
          "beneficial-ownership and company-structure information should be accurate and current;",
          "BaytMiftah does not guarantee that all business records have been reviewed to an external legal standard;",
          "personally identifying information should be handled under the privacy and security controls applicable to the workflow.",
        ],
      },
    ],
  }),
  policy({
    slug: "business-verification",
    title: "Business Verification & Commercial Due Diligence",
    category: "general",
    description:
      "Commercial and workspace accounts may be subject to verification steps to support anti-fraud, onboarding, and trust review.",
    seoTitle: "BaytMiftah Business Verification & Commercial Due Diligence",
    seoDescription:
      "Notice about verification checks for organizations, business accounts, agencies, developers, and commercial workspaces using BaytMiftah.",
    relatedPolicies: ["kyc", "beneficial-ownership", "professional-credentials", "terms"],
    sections: [
      {
        heading: "Verification scope",
        content:
          "BaytMiftah may request business registration documents, tax status information, wallet verification, authority details, or other evidence to support onboarding and trust review for business or workspace accounts. This review is not a substitute for an external audit or legal certification of a business.",
      },
      {
        heading: "Operational use",
        bullets: [
          "verification may be used to reduce fraud and improve trust signals;",
          "results may be limited to the exact review performed and are time-bound;",
          "final onboarding and permissions approval remains a business and operational decision under the relevant policy and controls.",
        ],
      },
    ],
  }),
  policy({
    slug: "anti-bribery-corruption",
    title: "Anti-Bribery & Corruption Policy",
    category: "general",
    description:
      "BaytMiftah and participating organizations must avoid bribery, corruption, facilitation payments, and improper influence in commercial or public-sector dealings.",
    seoTitle: "BaytMiftah Anti-Bribery & Corruption Policy",
    seoDescription:
      "BaytMiftah's anti-bribery and corruption standards for users, staff, service providers, and business partners involved in marketplace and workspace operations.",
    relatedPolicies: ["terms", "business-saas-terms", "professional-credentials", "whitelabel"],
    sections: [
      {
        heading: "Rules",
        content:
          "Users and organizations should not offer, promise, give, or accept improper payments, gifts, commissions, inducements, or facilitation payments in connection with BaytMiftah activity, listings, referrals, approvals, or vendor relationships. Applicable anti-bribery and anti-corruption laws may require additional procedures for regulated sectors or public-sector activity.",
      },
      {
        heading: "Confidential reporting",
        bullets: [
          "concerns should be reported through the applicable internal or platform reporting route;",
          "BaytMiftah may investigate factual allegations and suspend high-risk activity pending review;",
          "this policy is a control framework and not a global legal opinion for every jurisdiction.",
        ],
      },
    ],
  }),
  policy({
    slug: "conflicts-of-interest",
    title: "Conflicts of Interest & Referral Integrity",
    category: "general",
    description:
      "Users, personnel, agents, and partners should disclose material conflicts of interest and avoid hidden or undisclosed self-dealing.",
    seoTitle: "BaytMiftah Conflicts of Interest & Referral Integrity",
    seoDescription:
      "Disclosure and management standards for conflicts of interest, self-dealing, and referral relationships on BaytMiftah.",
    relatedPolicies: ["terms", "referrals", "professional-credentials", "whitelabel"],
    sections: [
      {
        heading: "Disclosure obligations",
        content:
          "Users or parties involved in a transaction, referral, agency workflow, or vendor arrangement should disclose material conflicts of interest before acting or receiving a benefit. This includes undisclosed financial interests, agency relationships, referral payments, or self-dealing arrangements that could affect a decision or recommendation.",
      },
      {
        heading: "Referral integrity",
        bullets: [
          "referral and performance-based compensation should be disclosed where relevant to the user or decision-maker;",
          "BaytMiftah may restrict or investigate cooperation where undisclosed or abusive referrals are suspected;",
          "jurisdictional rules may impose additional disclosure or approval steps for certain sectors or transactions.",
        ],
      },
    ],
  }),
  policy({
    slug: "referrals",
    title: "Referral & Introducer Program Terms",
    category: "general",
    description:
      "Referral or introducer programs must be transparent, lawfully structured, and clearly disclosed to the affected parties.",
    seoTitle: "BaytMiftah Referral & Introducer Program Terms",
    seoDescription:
      "Rules for referral incentives, commission disclosure, partner approvals, and referral integrity in BaytMiftah programs.",
    relatedPolicies: ["terms", "business-saas-terms", "conflicts-of-interest", "privacy"],
    sections: [
      {
        heading: "Program use",
        content:
          "BaytMiftah may support partner, agent, or referral programs that award fees, credits, or other consideration for introducing users or businesses to supported services. Any such offer must be clearly described, lawfully permitted, and consistent with the parties' rights and obligations.",
      },
      {
        heading: "Disclosure and compliance",
        bullets: [
          "referral compensation, fees, or incentives should be disclosed before a party acts on the referral;",
          "BaytMiftah does not guarantee that every referral program is permitted in every region or market;",
          "operators remain responsible for local licensing, disclosure, and consumer-protection requirements.",
        ],
      },
    ],
  }),
  policy({
    slug: "insurance-mortgage-disclosures",
    title: "Insurance & Mortgage Disclosure Notice",
    category: "general",
    description:
      "Where BaytMiftah surfaces insurance, mortgage, or financing information, it remains informational and subject to provider terms and jurisdiction-specific regulatory rules.",
    seoTitle: "BaytMiftah Insurance & Mortgage Disclosure Notice",
    seoDescription:
      "The limits of BaytMiftah's role in advertising or facilitating insurance, mortgage, and financing products.",
    relatedPolicies: ["terms", "liability", "professional-credentials", "payments"],
    sections: [
      {
        heading: "Informational nature",
        content:
          "BaytMiftah may display third-party insurance, mortgage, financing, or property-cover information as part of a discovery or transaction workflow. This does not make BaytMiftah an insurer, insurer broker, mortgage lender, or regulated financial adviser unless explicitly stated in a dedicated agreement.",
      },
      {
        heading: "User responsibility",
        bullets: [
          "buyers, tenants, and operators should review provider terms, product suitability, and policy documents directly;",
          "local law may require specific disclosures or approvals before an insurance or financing product is offered or accepted;",
          "coverage and financing terms remain subject to the provider's own terms, underwriting, and regulatory requirements.",
        ],
      },
    ],
  }),
  policy({
    slug: "hazard-disclosures",
    title: "Hazard, Defect & Safety Disclosure Notice",
    category: "general",
    description:
      "Properties and spaces may contain hazards, defects, or unobserved risks. BaytMiftah requires responsible disclosure by the listing party and does not guarantee hazard-free conditions.",
    seoTitle: "BaytMiftah Hazard, Defect & Safety Disclosure Notice",
    seoDescription:
      "Notice about hazards, defects, safety risks, and the limits of BaytMiftah's inspection or warranty role in property transactions.",
    relatedPolicies: ["safety", "terms", "inspection-disclaimer", "liability"],
    sections: [
      {
        heading: "Disclosure expectations",
        content:
          "Listing parties remain responsible for material information about hazards, defects, structural issues, environmental conditions, crime exposure, and other safety or property concerns relevant to a prospective user. BaytMiftah does not inspect every property or guarantee that a listing contains all material disclosures.",
      },
      {
        heading: "Safety limits",
        bullets: [
          "hazard information may be incomplete, outdated, or omitted;",
          "users should perform due diligence, inspections, and local legal checks before relying on a listing to make a decision;",
          "the platform does not convert undisclosed hazards into a warranty or guarantee of fitness for use.",
        ],
      },
    ],
  }),
  policy({
    slug: "government-request-handling",
    title: "Government Requests & Law-Enforcement Handling",
    category: "general",
    description:
      "BaytMiftah may respond to valid government or legal requests in a documented, privacy-aware, and lawful manner under applicable process and authority.",
    seoTitle: "BaytMiftah Government Requests & Law-Enforcement Handling",
    seoDescription:
      "Rules for handling valid government requests, legal process, data preservation, and confidentiality in regulated platform operations.",
    relatedPolicies: ["privacy-rights", "legal-hold", "terms", "security-reporting"],
    sections: [
      {
        heading: "Process",
        content:
          "BaytMiftah may receive formal requests from regulators, law-enforcement bodies, or legally authorised authorities and will assess the request, the applicable legal authority, and the data involved. Responses are subject to jurisdiction, process requirements, privacy obligations, and the applicable platform operator structure.",
      },
      {
        heading: "Notice and limits",
        bullets: [
          "BaytMiftah may notify affected users where legally permitted and operationally appropriate;",
          "records and data may be preserved while a valid request is assessed;",
          "the platform does not promise to disclose data absent a valid legal basis or authority.",
        ],
      },
    ],
  }),
  policy({
    slug: "legal-hold",
    title: "Legal Hold & Preservation Policy",
    category: "general",
    description:
      "Certain records must be preserved when a dispute, investigation, audit, or legal issue is reasonably identified.",
    seoTitle: "BaytMiftah Legal Hold & Preservation Policy",
    seoDescription:
      "How BaytMiftah preserves records and restricts deletion when legal holds, audits, or disputes are active.",
    relatedPolicies: ["data-retention", "privacy-rights", "records-management", "government-request-handling"],
    sections: [
      {
        heading: "Purpose",
        content:
          "A legal hold is a preservation instruction that suspends ordinary deletion or modification of records relevant to an active dispute, investigation, audit, regulatory inquiry, or claim. Where a legal hold applies, the applicable data must be preserved until the hold is released or legal advice states otherwise.",
      },
      {
        heading: "Controls",
        bullets: [
          "deletion and modification should be restricted for records under legal hold;",
          "only authorized compliance or legal owners should lift a hold after review;",
          "relevant evidence and supporting metadata must be preserved in the audited record set.",
        ],
      },
    ],
  }),
  policy({
    slug: "records-management",
    title: "Records Management & Evidence Controls",
    category: "general",
    description:
      "BaytMiftah should maintain records in ways that support accountability, dispute resolution, audits, and operational continuity.",
    seoTitle: "BaytMiftah Records Management & Evidence Controls",
    seoDescription:
      "Requirements for classification, retention, proof preservation, and evidence management across BaytMiftah workflows.",
    relatedPolicies: ["data-retention", "legal-hold", "review-audit-evidence", "privacy-rights"],
    sections: [
      {
        heading: "Record categories",
        content:
          "Records may include user account information, transaction logs, communications, consent records, KYC evidence, support tickets, visitor logs, device actions, and governance or audit records. These records should be stored, classified, and secured in a way that supports operational accountability and the legal obligations applicable to the workflow.",
      },
      {
        heading: "Evidence control",
        bullets: [
          "records should be traceable to the relevant event or decision;",
          "authentication, approval, and retention metadata should be protected from tampering;",
          "records management remains deployment- and workflow-specific, not a single universal record standard.",
        ],
      },
    ],
  }),
  policy({
    slug: "mobile-electron-terms",
    title: "Mobile & Desktop Application Terms",
    category: "general",
    description:
      "Desktop and mobile app use may be subject to additional app-specific terms, platform rules, permissions, and security requirements.",
    seoTitle: "BaytMiftah Mobile & Desktop Application Terms",
    seoDescription:
      "Rules for using BaytMiftah mobile or desktop applications, local-device permissions, and app-specific operational limits.",
    relatedPolicies: ["terms", "privacy", "security-reporting", "acceptable-use"],
    sections: [
      {
        heading: "App-specific rules",
        content:
          "BaytMiftah mobile apps, web wrappers, and desktop runtimes may be subject to operating-system permissions, local storage limits, notifications, deep-link handling, security requirements, and app store or distribution rules. Local app behavior should not be treated as a substitute for server-side authorisation or workflow enforcement.",
      },
      {
        heading: "Operational limits",
        bullets: [
          "client-side code may be tampered with or run outside the intended operating environment;",
          "security-sensitive actions should be enforced on the server side and not solely in the app client;",
          "distribution channels and application store terms remain separate legal obligations.",
        ],
      },
    ],
  }),
  policy({
    slug: "third-party-notices",
    title: "Third-Party Notices & Processor Dependencies",
    category: "general",
    description:
      "BaytMiftah relies on providers for payments, communications, verification, cloud hosting, and other services. Provider obligations and restrictions remain separate from BaytMiftah's own terms.",
    seoTitle: "BaytMiftah Third-Party Notices & Processor Dependencies",
    seoDescription:
      "Notice about BaytMiftah's dependency on providers, their terms, and the limited nature of platform control over provider behavior.",
    relatedPolicies: ["privacy", "subprocessors", "payments", "developer-api-terms"],
    sections: [
      {
        heading: "Provider dependency",
        content:
          "BaytMiftah may use third-party providers for hosting, identity verification, messaging, storage, analytics, payment processing, geolocation, and support services. Those providers operate under their own terms and service arrangements, and the legal responsibility for the provider's services remains with the provider and the contracting party.",
      },
      {
        heading: "User responsibility",
        bullets: [
          "users should review provider terms where a provider is directly part of the transaction;",
          "BaytMiftah does not guarantee provider functionality, uptime, pricing, or adjudication outcomes;",
          "deployment or integration changes may introduce new provider dependencies or restrictions.",
        ],
      },
    ],
  }),
  policy({
    slug: "security-reporting",
    title: "Security Reporting & Vulnerability Disclosure",
    category: "general",
    description:
      "Security issues should be reported responsibly and handled through the applicable disclosure and triage process.",
    seoTitle: "BaytMiftah Security Reporting & Vulnerability Disclosure",
    seoDescription:
      "How BaytMiftah handles vulnerability reports, triage, customer impact assessments, and secure disclosure procedures.",
    relatedPolicies: ["terms", "privacy", "acceptable-use", "mobile-electron-terms"],
    sections: [
      {
        heading: "Responsible reporting",
        content:
          "Users, researchers, or partners may report suspected security issues or vulnerabilities through the disclosed contact or reporting channel. BaytMiftah may assess the severity, scope, and reproduction information before any public disclosure or remediation statement.",
      },
      {
        heading: "Remediation and no waiver",
        bullets: [
          "good-faith reporting does not waive lawful rights or obligations;",
          "BaytMiftah may require a reasonable reporting window and safe handling process before public disclosure;",
          "the existence of this policy does not guarantee a particular remediation timeline or a legal privilege for any specific finder.",
        ],
      },
    ],
  }),
  policy({
    slug: "inspection-disclaimer",
    title: "Inspection, Condition & Site-Visit Disclaimer",
    category: "general",
    description:
      "Site inspections, condition reports, and walkthroughs are limited by the persons involved, the evidence available, and the property-specific circumstances.",
    seoTitle: "BaytMiftah Inspection, Condition & Site-Visit Disclaimer",
    seoDescription:
      "Notice about the limits of inspections, walkthroughs, condition reports, and property-condition claims on BaytMiftah.",
    relatedPolicies: ["hazard-disclosures", "terms", "liability", "professional-credentials"],
    sections: [
      {
        heading: "No guarantee",
        content:
          "A property walkthrough, inspection summary, or condition report may help a party understand a property, but it does not guarantee that hidden defects, latent hazards, or unobserved conditions are absent. Inspections may be limited by access, timing, and the information available at the time of the visit.",
      },
      {
        heading: "User safeguards",
        bullets: [
          "users should request additional inspection, survey, or specialist reviews where material decisions or health, safety, or legal issues are involved;",
          "BaytMiftah does not replace a professional surveyor, inspector, or technical adviser;",
          "property condition is still a matter to be checked by the user and the relevant professional or legal adviser.",
        ],
      },
    ],
  }),
  policy({
    slug: "review-audit-evidence",
    title: "Review, Audit & Evidence Record Policy",
    category: "general",
    description:
      "BaytMiftah may maintain review and audit evidence to support internal controls, dispute resolution, and operational accountability.",
    seoTitle: "BaytMiftah Review, Audit & Evidence Record Policy",
    seoDescription:
      "How BaytMiftah preserves evidence from decisions, reviews, and audits across sensitive product workflows and operational controls.",
    relatedPolicies: ["records-management", "legal-hold", "privacy-rights", "business-saas-terms"],
    sections: [
      {
        heading: "Evidence expectations",
        content:
          "Where BaytMiftah records or relies on a review, approval, or decision, the evidence supporting that action should be retained in a way that is attributable, access-controlled, and understandable. This may include timestamps, comments, approvals, role information, logs, screenshots, policy references, or other supporting evidence.",
      },
      {
        heading: "Audit integrity",
        bullets: [
          "audit trails should be protected from tampering or simplification where they may be relied upon in disputes or investigations;",
          "evidence retention and review practices remain workflow-specific and may vary by product and jurisdiction;",
          "a review decision is not a guarantee of legal certainty where a separate regulatory or contractual process remains required.",
        ],
      },
    ],
  }),
];
