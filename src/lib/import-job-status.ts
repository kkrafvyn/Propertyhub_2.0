export type ImportJobStatus =
  | "draft"
  | "validated"
  | "importing"
  | "imported"
  | "partially_imported"
  | "failed";

export function resolveImportJobStatus(
  totalEligible: number,
  imported: number,
  failed: number,
): ImportJobStatus {
  if (totalEligible === 0) return "failed";
  if (failed === 0) return "imported";
  if (imported === 0) return "failed";
  return "partially_imported";
}

export function importJobStatusVariant(
  status: string,
): "default" | "outline" | "destructive" | "secondary" {
  if (status === "imported") return "default";
  if (status === "partially_imported") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}
