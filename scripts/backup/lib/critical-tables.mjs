/** Tables that must exist in every full backup and restore drill. */
export const CRITICAL_TABLES = [
  "users",
  "organizations",
  "organization_members",
  "properties",
  "listings",
  "leases",
  "payment_transactions",
  "transactions",
  "audit_logs",
  "kyc_submissions",
  "trust_verification_requests",
  "fraud_review_cases",
  "messages",
  "organization_documents",
];

/** Orphan-row checks run during --verify-db restore drills. */
export const RELATIONSHIP_CHECKS = [
  {
    name: "organization_members → organizations",
    sql: `
      SELECT COUNT(*)::int AS orphans
      FROM public.organization_members om
      LEFT JOIN public.organizations o ON o.id = om.organization_id
      WHERE o.id IS NULL
    `,
  },
  {
    name: "listings → organizations",
    sql: `
      SELECT COUNT(*)::int AS orphans
      FROM public.listings l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.organization_id IS NOT NULL AND o.id IS NULL
    `,
  },
  {
    name: "properties → organizations",
    sql: `
      SELECT COUNT(*)::int AS orphans
      FROM public.properties p
      LEFT JOIN public.organizations o ON o.id = p.organization_id
      WHERE p.organization_id IS NOT NULL AND o.id IS NULL
    `,
  },
  {
    name: "organization_members → users",
    sql: `
      SELECT COUNT(*)::int AS orphans
      FROM public.organization_members om
      LEFT JOIN public.users u ON u.id = om.user_id
      WHERE u.id IS NULL
    `,
  },
];
