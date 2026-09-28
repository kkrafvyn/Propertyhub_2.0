export type RepresentativeAction =
  | "view_ledger"
  | "approve_offer"
  | "payment_release"
  | "view_documents"
  | "manage_contacts"
  | "issue_notice";

export type RepresentativeScope = {
  representativeId: string;
  organizationId: string;
  allowedActions: RepresentativeAction[];
  status: "approved" | "pending" | "rejected";
  expiresAt: string;
  scopeNotes?: string | null;
};

export function buildRepresentativeScope(input: {
  representativeId: string;
  organizationId: string;
  allowedActions: RepresentativeAction[];
  status: RepresentativeScope["status"];
  expiresAt: string;
  scopeNotes?: string | null;
}): RepresentativeScope {
  return {
    representativeId: input.representativeId,
    organizationId: input.organizationId,
    allowedActions: [...new Set(input.allowedActions)],
    status: input.status,
    expiresAt: input.expiresAt,
    scopeNotes: input.scopeNotes ?? null,
  };
}

export function authorizeRepresentativeAction(scope: RepresentativeScope, action: RepresentativeAction): boolean {
  if (scope.status !== "approved") {
    throw new Error("Representative authority status is not approved.");
  }

  const expiresAtMs = new Date(scope.expiresAt).getTime();
  if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error("Representative authority expired or is invalid.");
  }

  if (!scope.allowedActions.includes(action)) {
    throw new Error(`Representative action is outside delegated scope: ${String(action)}`);
  }

  return true;
}
