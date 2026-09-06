export type ApprovalChainDomain =
  | "maintenance"
  | "procurement"
  | "finance"
  | "lease"
  | "disbursement"
  | "listing"
  | "custom";

export type ApprovalChainStep = {
  order: number;
  label: string;
  role?: string | null;
  user_id?: string | null;
};

export type OrganizationApprovalChain = {
  id: string;
  organization_id: string;
  domain: ApprovalChainDomain;
  name: string;
  description: string | null;
  steps: ApprovalChainStep[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export const APPROVAL_CHAIN_DOMAINS: Array<{ id: ApprovalChainDomain; label: string; description: string }> = [
  { id: "maintenance", label: "Maintenance", description: "Work order → technician → supervisor → manager" },
  { id: "procurement", label: "Procurement", description: "Purchase requests and vendor approvals" },
  { id: "finance", label: "Finance", description: "Journal entries, variances, and payouts" },
  { id: "lease", label: "Leasing", description: "Lease applications and renewals" },
  { id: "disbursement", label: "Owner disbursements", description: "Owner payout approval chain" },
  { id: "listing", label: "Listings", description: "Listing publish and price change approvals" },
  { id: "custom", label: "Custom", description: "General-purpose approval workflow" },
];

export const APPROVAL_STEP_ROLE_OPTIONS = [
  "technician",
  "property_manager",
  "supervisor",
  "finance_manager",
  "owner",
  "organization_admin",
];
