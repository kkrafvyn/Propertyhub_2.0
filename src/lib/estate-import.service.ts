import { supabase } from "./supabase";
import { estateOperationsService } from "./estate-operations.service";
import { csvCell, csvHeaderMap, parseCsv } from "./csv-parse";
import { resolveImportJobStatus } from "./import-job-status";

const db = supabase as any;
export type ImportRow = { rowNumber: number; estateName: string; unitIdentifier: string; block?: string; floor?: string; errors: string[] };
export type OccupancyImportRow = { rowNumber: number; estateName: string; unitIdentifier: string; userEmail: string; role: "owner" | "tenant" | "buyer" | ""; startDate: string; errors: string[] };
export type OpeningChargeImportRow = { rowNumber:number; estateName:string; unitIdentifier:string; amount:string; dueDate:string; chargeType:string; description:string; errors:string[] };

function dataRows(content: string) {
  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.trim().length > 0));
  const headers = rows[0] || [];
  const map = csvHeaderMap(headers);
  return { rows: rows.slice(1), map };
}

export function parseEstateUnitsCsv(content: string): ImportRow[] {
  const { rows, map } = dataRows(content);
  return rows.map((parts, index) => {
    const estateName = csvCell(parts, map, "estate_name") || csvCell(parts, map, "estate");
    const unitIdentifier = csvCell(parts, map, "unit_identifier") || csvCell(parts, map, "unit");
    return {
      rowNumber: index + 2,
      estateName,
      unitIdentifier,
      block: csvCell(parts, map, "block") || undefined,
      floor: csvCell(parts, map, "floor") || undefined,
      errors: [!estateName && "Estate name is required", !unitIdentifier && "Unit identifier is required"].filter(Boolean) as string[],
    };
  });
}

export function parseOccupanciesCsv(content: string): OccupancyImportRow[] {
  const { rows, map } = dataRows(content);
  return rows.map((parts, index) => {
    const estateName = csvCell(parts, map, "estate_name") || csvCell(parts, map, "estate");
    const unitIdentifier = csvCell(parts, map, "unit_identifier") || csvCell(parts, map, "unit");
    const userEmail = csvCell(parts, map, "user_email") || csvCell(parts, map, "email");
    const role = csvCell(parts, map, "role") as OccupancyImportRow["role"];
    const startDate = csvCell(parts, map, "start_date");
    return {
      rowNumber: index + 2,
      estateName,
      unitIdentifier,
      userEmail,
      role,
      startDate,
      errors: [
        !estateName && "Estate name is required",
        !unitIdentifier && "Unit identifier is required",
        !userEmail && "User email is required",
        !["owner", "tenant", "buyer"].includes(role) && "Role must be owner, tenant, or buyer",
        !startDate && "Start date is required",
      ].filter(Boolean) as string[],
    };
  });
}

export function parseOpeningChargesCsv(content: string): OpeningChargeImportRow[] {
  const { rows, map } = dataRows(content);
  return rows.map((parts, index) => {
    const estateName = csvCell(parts, map, "estate_name") || csvCell(parts, map, "estate");
    const unitIdentifier = csvCell(parts, map, "unit_identifier") || csvCell(parts, map, "unit");
    const amount = csvCell(parts, map, "amount");
    const dueDate = csvCell(parts, map, "due_date");
    const chargeType = csvCell(parts, map, "charge_type") || "other";
    const description = csvCell(parts, map, "description");
    return {
      rowNumber: index + 2,
      estateName,
      unitIdentifier,
      amount,
      dueDate,
      chargeType,
      description,
      errors: [
        !estateName && "Estate name is required",
        !unitIdentifier && "Unit identifier is required",
        !(Number(amount) > 0) && "Amount must be greater than zero",
        !dueDate && "Due date is required",
      ].filter(Boolean) as string[],
    };
  });
}

export const estateImportService = {
  async createJob(input: { organizationId: string; fileName: string; rows: Array<ImportRow | OccupancyImportRow>; userId: string; importType?: "estates_units" | "occupancies" }) {
    const valid = input.rows.filter((row) => !row.errors.length);
    const { data: job, error } = await db.from("estate_import_jobs").insert({
      organization_id: input.organizationId,
      import_type: input.importType || "estates_units",
      file_name: input.fileName,
      status: valid.length === input.rows.length ? "validated" : "draft",
      total_rows: input.rows.length,
      valid_rows: valid.length,
      created_by: input.userId,
    }).select("*").single();
    if (error) throw error;
    const { error: rowError } = await db.from("estate_import_rows").insert(
      input.rows.map((row) => ({ job_id: job.id, row_number: row.rowNumber, payload_json: row, validation_errors: row.errors })),
    );
    if (rowError) throw rowError;
    return job;
  },

  async importJob(input: { jobId: string; organizationId: string; userId: string }) {
    const { data: job, error: jobError } = await db.from("estate_import_jobs").select("*").eq("id", input.jobId).single();
    if (jobError) throw jobError;
    if (job.organization_id !== input.organizationId) {
      throw new Error("Import job does not belong to this organization");
    }

    const orgId = job.organization_id as string;
    await db.from("estate_import_jobs").update({ status: "importing" }).eq("id", input.jobId);

    const { data: rows, error } = await db.from("estate_import_rows").select("*").eq("job_id", input.jobId).eq("imported", false).contains("validation_errors", []);
    if (error) throw error;

    let estates = await estateOperationsService.getEstates(orgId);
    let units = await estateOperationsService.getUnits(estates.map((x) => x.id));
    let imported = 0;
    let failed = 0;

    for (const row of rows || []) {
      const p = row.payload_json;
      try {
        let estate = estates.find((x) => x.name.toLowerCase() === String(p.estateName).toLowerCase());
        if (job.import_type === "estates_units") {
          if (!estate) {
            estate = await estateOperationsService.createEstate({ organizationId: orgId, name: p.estateName });
            estates = [...estates, estate];
          }
          if (units.some((x) => x.estate_id === estate!.id && x.identifier.toLowerCase() === String(p.unitIdentifier).toLowerCase())) {
            throw new Error("Unit already exists in this estate");
          }
          const unit = await estateOperationsService.createUnit({
            estateId: estate.id,
            identifier: p.unitIdentifier,
            block: p.block || undefined,
            floor: p.floor || undefined,
          });
          units = [...units, unit];
        } else if (job.import_type === "occupancies") {
          if (!estate) throw new Error("Estate not found; import estates and units first");
          const unit = units.find((x) => x.estate_id === estate!.id && x.identifier.toLowerCase() === String(p.unitIdentifier).toLowerCase());
          if (!unit) throw new Error("Unit not found");
          const { data: user } = await db.from("users").select("id").eq("email", p.userEmail).maybeSingle();
          if (!user) throw new Error("User email is not registered");
          const { error: insertError } = await db.from("unit_occupancies").insert({
            unit_id: unit.id,
            user_id: user.id,
            role: p.role,
            start_date: p.startDate,
          });
          if (insertError) throw insertError;
        } else {
          throw new Error("Unsupported import type");
        }
        await db.from("estate_import_rows").update({ imported: true }).eq("id", row.id);
        imported += 1;
      } catch (failure: any) {
        failed += 1;
        await db.from("estate_import_rows").update({ validation_errors: [failure.message || "Unable to import row"] }).eq("id", row.id);
      }
    }

    const totalEligible = (rows || []).length;
    const status = resolveImportJobStatus(totalEligible, imported, failed);
    await db.from("estate_import_jobs").update({
      status,
      approved_by: input.userId,
      imported_rows: imported,
      failed_rows: failed,
      imported_at: new Date().toISOString(),
    }).eq("id", input.jobId);

    return imported;
  },

  async getJobs(organizationId: string) {
    const { data, error } = await db.from("estate_import_jobs").select("*, rows:estate_import_rows(*)").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
