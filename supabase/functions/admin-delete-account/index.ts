import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { userClient } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    const body = await req.json().catch(() => null);
    if (!body || typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId)
      || body.confirmation !== body.userId) {
      throw new HttpError(400, "Confirm the selected account before deleting it");
    }
    // The caller's JWT reaches the database, which checks admin/MFA and ownership.
    const { error: prepareError } = await userClient.rpc("admin_prepare_account_deletion", { p_user_id: body.userId });
    if (prepareError) throw new HttpError(403, prepareError.message);

    const admin = createAdminClient();
    const { data: identity, error: lookupError } = await admin.auth.admin.getUserById(body.userId);
    if (lookupError && lookupError.status !== 404) {
      throw new HttpError(502, "Account is locked, but sign-in deletion could not be checked. Retry deletion.");
    }
    if (identity?.user && !(identity.user as { deleted_at?: string }).deleted_at) {
      // Soft-delete Auth to retain public.users and its business-record foreign keys.
      const { error } = await admin.auth.admin.deleteUser(body.userId, true);
      if (error) throw new HttpError(502, "Account is locked, but sign-in deletion failed. Retry deletion.");
    }
    const { error: completeError } = await userClient.rpc("admin_complete_account_deletion", { p_user_id: body.userId });
    if (completeError) throw new HttpError(502, "Sign-in was removed, but recording completion failed. Retry deletion.");
    return jsonResponse(200, { deleted: true, businessRecordsRetained: true }, req);
  } catch (error) {
    return jsonResponse(error instanceof HttpError ? error.status : 500,
      { error: safeErrorMessage(error, "Unable to delete account") }, req);
  }
});
