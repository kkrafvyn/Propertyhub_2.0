import { getSupabaseClient, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { asString, requireObject } from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "summary";

    if (req.method === "GET" && action === "summary") {
      const [documents, negotiations, checklists] = await Promise.all([
        supabase.from("transaction_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("negotiation_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("closing_checklists").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      [documents.error, negotiations.error, checklists.error].forEach((error) => {
        if (error && !missingTable(error)) throw error;
      });
      return jsonResponse({
        documents: documents.data || [],
        negotiations: negotiations.data || [],
        checklists: checklists.data || [],
      });
    }

    if (req.method === "POST" && action === "document") {
      const body = requireObject(await req.json());
      const payload = {
        user_id: user.id,
        listing_id: asString(body.listingId || body.listing_id) || null,
        offer_packet_id: asString(body.offerPacketId || body.offer_packet_id) || null,
        document_type: asString(body.documentType || body.document_type) || "general",
        title: asString(body.title) || "Transaction document",
        storage_path: asString(body.storagePath || body.storage_path) || null,
        status: asString(body.status) || "draft",
        metadata: body.metadata || body,
      };
      const { data, error } = await supabase.from("transaction_documents").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "counter-offer") {
      const body = requireObject(await req.json());
      const payload = {
        user_id: user.id,
        offer_packet_id: asString(body.offerPacketId || body.offer_packet_id) || null,
        event_type: "counter_offer",
        amount: Number(body.amount || 0),
        message: asString(body.message) || null,
        status: "open",
        metadata: body.metadata || body,
      };
      const { data, error } = await supabase.from("negotiation_events").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "closing-checklist") {
      const body = requireObject(await req.json());
      const payload = {
        user_id: user.id,
        offer_packet_id: asString(body.offerPacketId || body.offer_packet_id) || null,
        items: body.items || [],
        status: asString(body.status) || "open",
      };
      const { data, error } = await supabase.from("closing_checklists").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Transaction function failed", 400);
  }
});
