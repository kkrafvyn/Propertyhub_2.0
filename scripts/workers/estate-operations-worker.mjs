import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runRpc(name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data;
}

const asOfDate = process.env.ESTATE_OPERATIONS_AS_OF_DATE || new Date().toISOString().slice(0, 10);

try {
  const generatedCharges = await runRpc("run_due_estate_charge_schedules", { p_as_of_date: asOfDate });
  const verifiedPromises = await runRpc("verify_due_collection_promises", { p_as_of_date: asOfDate });
  console.log(JSON.stringify({ asOfDate, generatedCharges, verifiedPromises }));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
