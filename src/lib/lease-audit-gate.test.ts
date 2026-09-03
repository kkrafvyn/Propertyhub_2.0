import { describe, expect, it } from "vitest";
import {
  assertLeaseAuditPassing,
  LeaseAuditBlockedError,
  leaseAuditGateLabel,
  MIN_LEASE_AUDIT_SCORE,
} from "./lease-audit-gate";

describe("lease-audit-gate", () => {
  it("passes at or above minimum score", () => {
    expect(() => assertLeaseAuditPassing(MIN_LEASE_AUDIT_SCORE)).not.toThrow();
    expect(leaseAuditGateLabel(80)).toBe("pass");
  });

  it("blocks below minimum without override", () => {
    expect(() => assertLeaseAuditPassing(40)).toThrow(LeaseAuditBlockedError);
    expect(leaseAuditGateLabel(40)).toBe("warn");
    expect(leaseAuditGateLabel(30)).toBe("block");
  });

  it("allows override when forceOverride is true", () => {
    expect(() => assertLeaseAuditPassing(20, { forceOverride: true })).not.toThrow();
  });
});
