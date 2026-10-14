import { supabase } from "./supabase";
import { estateOperationsService } from "./estate-operations.service";
import { csvCell, csvHeaderMap, parseCsv } from "./csv-parse";
import { resolveImportJobStatus } from "./import-job-status";

const db = supabase as any;
export type PaymentImportRow = {
  rowNumber: number;
  estateName: string;
  unitIdentifier: string;
  chargeId: string;
  amount: string;
  method: "momo" | "card" | "bank_transfer" | "cash" | "";
  reference: string;
  errors: string[];
};

export function parsePaymentTable(matrix: string[][]): PaymentImportRow[] {
  const rows = matrix.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length < 2) return [];
  const map = csvHeaderMap(rows[0]);
  return rows.slice(1).map((items, index) => {
    const estateName = csvCell(items, map, "estate_name") || csvCell(items, map, "estate");
    const unitIdentifier = csvCell(items, map, "unit_identifier") || csvCell(items, map, "unit");
    const chargeId = csvCell(items, map, "charge_id");
    const amount = csvCell(items, map, "amount");
    const method = csvCell(items, map, "method") as PaymentImportRow["method"];
    const reference = csvCell(items, map, "reference") || csvCell(items, map, "provider_reference");
    return {
      rowNumber: index + 2,
      estateName,
      unitIdentifier,
      chargeId,
      amount,
      method,
      reference,
      errors: [
        !estateName && "Estate name is required",
        !unitIdentifier && "Unit identifier is required",
        !chargeId && "Charge ID is required",
        !(Number(amount) > 0) && "Amount must be greater than zero",
        !["momo", "card", "bank_transfer", "cash"].includes(method) &&
          "Method must be momo, card, bank_transfer, or cash",
        !reference && "Reference is required",
      ].filter(Boolean) as string[],
    };
  });
}

export function parsePaymentCsv(content: string): PaymentImportRow[] {
  return parsePaymentTable(parseCsv(content));
}

export const paymentImportService = {
  parse: parsePaymentCsv,
  parseTable: parsePaymentTable,
  async createJob(input: {
    organizationId: string;
    userId: string;
    fileName: string;
    rows: PaymentImportRow[];
    extraction?: { sourceFormat?: string; extractionMethod?: string; extractionConfidence?: number };
  }) {
    const valid = input.rows.filter((row) => !row.errors.length);
    const { data: job, error } = await db
      .from("estate_import_jobs")
      .insert({
        organization_id: input.organizationId,
        import_type: "payments",
        file_name: input.fileName,
        status: valid.length === input.rows.length ? "validated" : "draft",
        total_rows: input.rows.length,
        valid_rows: valid.length,
        created_by: input.userId,
        source_format: input.extraction?.sourceFormat ?? null,
        extraction_method: input.extraction?.extractionMethod ?? null,
        extraction_confidence: input.extraction?.extractionConfidence ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    const { error: rowsError } = await db.from("estate_import_rows").insert(
      input.rows.map((row) => ({
        job_id: job.id,
        row_number: row.rowNumber,
        payload_json: row,
        validation_errors: row.errors,
      })),
    );
    if (rowsError) throw rowsError;
    return job;
  },
  async execute(input: { jobId: string; organizationId: string; userId: string }) {
    const { data: job, error: jobError } = await db
      .from("estate_import_jobs")
      .select("*")
      .eq("id", input.jobId)
      .single();
    if (jobError) throw jobError;
    if (job.organization_id !== input.organizationId) {
      throw new Error("Import job does not belong to this organization");
    }
    const orgId = job.organization_id as string;

    const { data: rows, error } = await db
      .from("estate_import_rows")
      .select("*")
      .eq("job_id", input.jobId)
      .eq("imported", false)
      .contains("validation_errors", []);
    if (error) throw error;
    const estates = await estateOperationsService.getEstates(orgId);
    const units = await estateOperationsService.getUnits(estates.map((item) => item.id));
    let imported = 0;
    let failed = 0;
    for (const row of rows || []) {
      const payload = row.payload_json;
      try {
        const estate = estates.find(
          (item) => item.name.toLowerCase() === String(payload.estateName).toLowerCase(),
        );
        const unit =
          estate &&
          units.find(
            (item) =>
              item.estate_id === estate.id &&
              item.identifier.toLowerCase() === String(payload.unitIdentifier).toLowerCase(),
          );
        if (!estate || !unit) throw new Error("Estate or unit not found");
        const amountMinor = Math.round(Number(payload.amount) * 100);
        const { error: paymentError } = await db.rpc("record_estate_payment", {
          p_unit_id: unit.id,
          p_paid_by_user_id: null,
          p_amount_minor: amountMinor,
          p_currency: estate.currency,
          p_method: payload.method,
          p_provider_reference: payload.reference,
          p_recorded_by_user_id: input.userId,
          p_allocations: [{ charge_id: payload.chargeId, amount_minor: amountMinor }],
        });
        if (paymentError) throw paymentError;
        await db.from("estate_import_rows").update({ imported: true }).eq("id", row.id);
        imported += 1;
      } catch (failure: any) {
        failed += 1;
        await db
          .from("estate_import_rows")
          .update({ validation_errors: [failure.message || "Unable to import row"] })
          .eq("id", row.id);
      }
    }
    const status = resolveImportJobStatus((rows || []).length, imported, failed);
    await db
      .from("estate_import_jobs")
      .update({
        status,
        approved_by: input.userId,
        imported_rows: imported,
        failed_rows: failed,
        imported_at: new Date().toISOString(),
      })
      .eq("id", input.jobId);
    return imported;
  },
};
