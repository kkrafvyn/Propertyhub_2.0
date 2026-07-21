import { supabase } from "./supabase";

export type BackendStatus =
  | { mode: "live" }
  | { mode: "offline" }
  | { mode: "empty" }
  | { mode: "error"; message: string };

export async function probeBackendConnection(): Promise<BackendStatus> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return { mode: "offline" };
  }

  try {
    const { count, error } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "listed")
      .limit(1);

    if (error) {
      return { mode: "error", message: error.message };
    }

    if ((count ?? 0) === 0) {
      return { mode: "empty" };
    }

    return { mode: "live" };
  } catch (error) {
    return {
      mode: "error",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
