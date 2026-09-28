export type PrivacyRequestType = "export" | "erasure" | "rectification" | "objjection";

export type PrivacyRequestContext = {
  requestType: PrivacyRequestType;
  userId: string;
  verifiedIdentity: boolean;
  activeLegalHold: boolean;
  hasActiveLease: boolean;
  hasOpenDispute?: boolean;
  safetyReviewRequired?: boolean;
};

export type PrivacyRequestDecision = {
  allowed: boolean;
  reason?: string;
  exports?: string[];
};

export function canProcessPrivacyRequest(context: PrivacyRequestContext): PrivacyRequestDecision {
  if (!context.verifiedIdentity) {
    return { allowed: false, reason: "Identity verification required." };
  }

  if (context.activeLegalHold) {
    return {
      allowed: false,
      reason: "Legal hold or active contract review prevents this privacy action.",
    };
  }

  if (context.requestType === "erasure" && (context.hasActiveLease || context.hasOpenDispute)) {
    return {
      allowed: false,
      reason: "Erasure is blocked while an active contract or dispute is open.",
    };
  }

  const exports = ["profile", "documents", "messages"] as const;

  if (context.requestType === "export") {
    return {
      allowed: true,
      reason: "Verified data-subject export can proceed.",
      exports: [...exports],
    };
  }

  if (context.requestType === "rectification") {
    return { allowed: true, reason: "Rectification update allowed." };
  }

  if (context.requestType === "objjection") {
    return { allowed: true, reason: "Objection accepted for processing review." };
  }

  return { allowed: true, reason: "Privacy request accepted for review." };
}

export function redactContactForSafeChannel(input: {
  phone?: string | null;
  email?: string | null;
  exactLocation?: string | null;
  allowSafeContact?: boolean;
  allowLocationSharing?: boolean;
}) {
  const safePhone = input.phone
    ? input.allowSafeContact
      ? input.phone
      : `${input.phone.slice(0, 4)}***${input.phone.slice(-2)}`
    : "not_provided";

  const safeEmail = input.email
    ? input.allowSafeContact
      ? input.email
      : input.email.replace(/(.{2}).*(@.*)/, "$1***$2")
    : "not_provided";

  const safeLocation = input.exactLocation
    ? input.allowLocationSharing
      ? input.exactLocation
      : "location_redacted_for_safe_channel"
    : "not_provided";

  return {
    phone: safePhone,
    email: safeEmail,
    exactLocation: safeLocation,
  };
}

export function safeLocationConsent(input: {
  allowLocationSharing: boolean;
  locationConsentStatus?: string | null;
}) {
  const allowed = Boolean(input.allowLocationSharing) && (input.locationConsentStatus === "granted" || input.locationConsentStatus === "explicit");

  return {
    allowed,
    status: allowed ? "granted" : "denied",
    reason: allowed ? "location sharing consent is active" : "explicit location consent is required before sharing exact location",
  };
}

export function buildPrivacyExport(input: {
  userId: string;
  includeProfile?: boolean;
  includePaymentHistory?: boolean;
  includeMessages?: boolean;
  includeLocation?: boolean;
  safetyReviewRequired?: boolean;
}) {
  const bundle = [
    input.includeProfile ? "profile" : null,
    input.includePaymentHistory ? "payments" : null,
    input.includeMessages ? "messages" : null,
    input.includeLocation ? "location" : null,
  ].filter(Boolean) as string[];

  return {
    userId: input.userId,
    data: bundle,
    safeBundle: Boolean(input.safetyReviewRequired) || bundle.includes("location"),
  };
}

export function applyPrivacyHold(input: {
  userId: string;
  holdType: "legal" | "safety" | "compliance";
  active: boolean;
}) {
  return {
    userId: input.userId,
    holdType: input.holdType,
    active: Boolean(input.active),
    frozen: Boolean(input.active),
  };
}
