import { describe, expect, it } from "vitest";
import {
  getActiveListingLimitState,
  getSeatLimitState,
  getWorkspaceAccessState,
  isPublicActiveListing,
  type OrganizationSubscription,
} from "./subscription.service";

function buildSubscription(
  overrides: Partial<OrganizationSubscription>
): OrganizationSubscription {
  return {
    id: "sub-1",
    organization_id: "org-1",
    tier_id: "starter",
    pending_tier_id: null,
    pending_tier_effective_at: null,
    provider: "paystack",
    status: "active",
    authorization_url: null,
    provider_reference: null,
    current_period_start: null,
    current_period_end: null,
    next_payment_at: null,
    grace_period_ends_at: null,
    cancel_at_period_end: false,
    activated_at: null,
    suspended_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

describe("subscription helpers", () => {
  it("blocks workspaces until billing is active", () => {
    expect(getWorkspaceAccessState(null)).toMatchObject({
      canAccess: false,
      canAct: false,
      title: "Billing setup required",
    });

    expect(
      getWorkspaceAccessState(buildSubscription({ status: "pending_payment" }))
    ).toMatchObject({
      canAccess: false,
      canAct: false,
      title: "Payment required",
    });
  });

  it("allows active, grace-period, and still-paid cancelled workspaces", () => {
    expect(getWorkspaceAccessState(buildSubscription({ status: "active" }))).toMatchObject({
      canAccess: true,
      canAct: true,
      severity: "ok",
    });

    expect(
      getWorkspaceAccessState(buildSubscription({ status: "grace_period" }))
    ).toMatchObject({
      canAccess: true,
      canAct: true,
      severity: "warning",
    });

    expect(
      getWorkspaceAccessState(
        buildSubscription({
          status: "cancelled",
          current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
        })
      )
    ).toMatchObject({
      canAccess: true,
      canAct: true,
      severity: "warning",
    });
  });

  it("enforces seat caps including pending invitations", () => {
    expect(
      getSeatLimitState({
        tier: { agent_seat_limit: 3 },
        activeMembers: 2,
        pendingInvitations: 1,
      })
    ).toMatchObject({
      limit: 3,
      used: 3,
      remaining: 0,
      isAtLimit: true,
    });

    expect(
      getSeatLimitState({
        tier: { agent_seat_limit: null },
        activeMembers: 25,
        pendingInvitations: 4,
      })
    ).toMatchObject({
      limit: null,
      remaining: null,
      isUnlimited: true,
      isAtLimit: false,
    });
  });

  it("enforces active public listing caps only for publishable listings", () => {
    expect(isPublicActiveListing({ status: "listed", visibility: "public" })).toBe(true);
    expect(isPublicActiveListing({ status: "draft", visibility: "public" })).toBe(false);

    expect(
      getActiveListingLimitState({
        tier: { active_listing_limit: 15 },
        activeListings: 15,
      })
    ).toMatchObject({
      limit: 15,
      used: 15,
      remaining: 0,
      isAtLimit: true,
    });
  });
});
