import {
  getSupabaseClient,
  verifyToken,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyToken(authHeader);

    const url = new URL(req.url);
    const ruleId = url.pathname.split("/").pop();

    const supabase = getSupabaseClient();

    if (req.method === "PUT") {
      // Update automation rule
      const { data: rule } = await supabase
        .from("smart_automation_rules")
        .select("user_id")
        .eq("id", ruleId)
        .single();

      if (rule?.user_id !== user.sub) {
        return errorResponse("Unauthorized", 403);
      }

      const updateData = await req.json();
      const { data, error } = await supabase
        .from("smart_automation_rules")
        .update(updateData)
        .eq("id", ruleId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "DELETE") {
      // Delete automation rule
      const { data: rule } = await supabase
        .from("smart_automation_rules")
        .select("user_id")
        .eq("id", ruleId)
        .single();

      if (rule?.user_id !== user.sub) {
        return errorResponse("Unauthorized", 403);
      }

      const { error } = await supabase
        .from("smart_automation_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});
