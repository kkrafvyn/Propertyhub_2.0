import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type StaffRow = {
  email: string | null;
  is_platform_admin: boolean | null;
  is_platform_manager: boolean | null;
  platform_console_grants: string[] | null;
  banned?: boolean | null;
};

/** Platform users who can review company enrollment requests. */
export async function getEnrollmentReviewStaffEmails(
  adminClient: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await adminClient
    .from("users")
    .select("email, is_platform_admin, is_platform_manager, platform_console_grants, banned")
    .not("email", "is", null);

  if (error || !data) {
    console.error("Failed to load enrollment review staff:", error?.message);
    return [];
  }

  const emails = new Set<string>();

  for (const row of data as StaffRow[]) {
    if (row.banned) continue;

    const email = row.email?.trim().toLowerCase();
    if (!email) continue;

    const grants = row.platform_console_grants ?? [];
    const canReview =
      row.is_platform_admin === true ||
      row.is_platform_manager === true ||
      grants.includes("organizations");

    if (canReview) {
      emails.add(email);
    }
  }

  return [...emails];
}
