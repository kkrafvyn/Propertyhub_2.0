import { supabase } from "./supabase";

const db = supabase as any;

export const enterpriseOperationsService = {
  async load(estateIds: string[]) {
    if (!estateIds.length) return { assets: [], meters: [], readings: [], tariffs: [], budgets: [], procurement: [], contracts: [] };
    const [assets, meters, tariffs, budgets, procurement, contracts] = await Promise.all([
      db.from("estate_assets").select("*").in("estate_id", estateIds).order("created_at", { ascending: false }),
      db.from("estate_meters").select("*").in("estate_id", estateIds).order("created_at", { ascending: false }),
      db.from("estate_utility_tariffs").select("*").in("estate_id", estateIds).eq("active", true).order("effective_from", { ascending: false }),
      db.from("estate_budgets").select("*").in("estate_id", estateIds).order("period", { ascending: false }),
      db.from("estate_procurement_requests").select("*").in("estate_id", estateIds).order("created_at", { ascending: false }),
      db.from("estate_contracts").select("*").in("estate_id", estateIds).order("end_date"),
    ]);
    for (const result of [assets, meters, tariffs, budgets, procurement, contracts]) if (result.error) throw result.error;
    const meterIds = (meters.data || []).map((meter: any) => meter.id);
    const readings = meterIds.length ? await db.from("estate_meter_readings").select("*").in("meter_id", meterIds).order("read_at", { ascending: false }) : { data: [], error: null };
    if (readings.error) throw readings.error;
    return { assets: assets.data || [], meters: meters.data || [], readings: readings.data || [], tariffs: tariffs.data || [], budgets: budgets.data || [], procurement: procurement.data || [], contracts: contracts.data || [] };
  },
  async createAsset(input: any) { const { data, error } = await db.from("estate_assets").insert({ estate_id: input.estateId, name: input.name.trim(), asset_type: input.assetType.trim(), location: input.location?.trim() || null, replacement_cost_minor: input.replacementCostMinor || null, currency: input.currency }).select("*").single(); if (error) throw error; return data; },
  async createMeter(input: any) { const { data, error } = await db.from("estate_meters").insert({ estate_id: input.estateId, unit_id: input.unitId || null, utility_type: input.utilityType, identifier: input.identifier.trim(), unit_of_measure: input.unitOfMeasure || "kWh" }).select("*").single(); if (error) throw error; return data; },
  async addReading(input: any) { const { data, error } = await db.from("estate_meter_readings").insert({ meter_id: input.meterId, reading_value: input.readingValue, source: input.source || "manual", evidence_path: input.evidencePath || null, recorded_by: input.recordedBy }).select("*").single(); if (error) throw error; return data; },
  async createTariff(input: any) { const { data, error } = await db.from("estate_utility_tariffs").insert({ estate_id: input.estateId, utility_type: input.utilityType, rate_minor_per_unit: input.rateMinorPerUnit, currency: input.currency, effective_from: input.effectiveFrom, created_by: input.createdBy }).select("*").single(); if (error) throw error; return data; },
  async issueUtilityCharge(meterReadingId: string, dueDate?: string) { const { data, error } = await db.rpc("issue_utility_charge", { p_meter_reading_id: meterReadingId, p_due_date: dueDate || undefined }); if (error) throw error; return data; },
  async createBudget(input: any) { const { data, error } = await db.from("estate_budgets").insert({ estate_id: input.estateId, category: input.category.trim(), period: input.period, budget_minor: input.budgetMinor, currency: input.currency, created_by: input.createdBy }).select("*").single(); if (error) throw error; return data; },
  async createProcurement(input: any) { const { data, error } = await db.from("estate_procurement_requests").insert({ estate_id: input.estateId, asset_id: input.assetId || null, title: input.title.trim(), description: input.description?.trim() || null, amount_minor: input.amountMinor || null, currency: input.currency, requested_by: input.requestedBy }).select("*").single(); if (error) throw error; return data; },
  async updateProcurementStatus(id: string, status: string, approvedBy?: string) { const { data, error } = await db.from("estate_procurement_requests").update({ status, approved_by: status === "approved" ? approvedBy || null : undefined, updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); if (error) throw error; return data; },
  async createContract(input: any) { const { data, error } = await db.from("estate_contracts").insert({ estate_id: input.estateId, contract_type: input.contractType.trim(), title: input.title.trim(), start_date: input.startDate, end_date: input.endDate || null, notice_days: input.noticeDays || 30, value_minor: input.valueMinor || null, currency: input.currency, owner_user_id: input.ownerUserId }).select("*").single(); if (error) throw error; return data; },
};
