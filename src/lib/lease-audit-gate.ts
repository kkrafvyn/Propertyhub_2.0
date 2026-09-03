export const MIN_LEASE_AUDIT_SCORE = 50;

export class LeaseAuditBlockedError extends Error {
  readonly auditScore: number;
  readonly violations: string[];

  constructor(auditScore: number, violations: string[] = []) {
    super(
      `Lease audit score ${auditScore}/100 is below minimum ${MIN_LEASE_AUDIT_SCORE}. ` +
        "Fix clauses or use manager override to send."
    );
    this.name = "LeaseAuditBlockedError";
    this.auditScore = auditScore;
    this.violations = violations;
  }
}

export function assertLeaseAuditPassing(
  auditScore: number,
  options?: { forceOverride?: boolean; violations?: string[] }
) {
  if (options?.forceOverride) return;
  if (auditScore < MIN_LEASE_AUDIT_SCORE) {
    throw new LeaseAuditBlockedError(auditScore, options?.violations);
  }
}

export function leaseAuditGateLabel(score: number): "pass" | "warn" | "block" {
  if (score >= MIN_LEASE_AUDIT_SCORE) return "pass";
  if (score >= 35) return "warn";
  return "block";
}
