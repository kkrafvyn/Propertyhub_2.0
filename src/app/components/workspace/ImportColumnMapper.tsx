import {
  canonicalFieldsForImportType,
  mapHeaders,
  requiredFields,
  type ImportTypeKey,
} from "../../../lib/import-column-mapping";

type Props = {
  importType: ImportTypeKey;
  rawHeaders: string[];
  effectiveMapping: Record<string, number>;
  overrides: Record<string, number>;
  onOverride: (field: string, columnIndex: number | undefined) => void;
};

export function ImportColumnMapper({
  importType,
  rawHeaders,
  effectiveMapping,
  overrides,
  onOverride,
}: Props) {
  const auto = mapHeaders(rawHeaders, importType);
  const required = requiredFields(importType);
  const optional = canonicalFieldsForImportType(importType).filter((f) => !required.includes(f));
  const fields = [...required, ...optional];

  if (rawHeaders.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Map columns</p>
      <p className="text-[11px] text-muted-foreground">
        Required fields must be mapped to a file column. Override auto-detected matches when needed.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => {
          const isRequired = required.includes(field);
          const autoIdx = auto.mapping[field];
          const effectiveIdx = effectiveMapping[field];
          const selected = overrides[field] ?? autoIdx ?? "";
          const autoLabel =
            autoIdx !== undefined ? rawHeaders[autoIdx] || `Column ${autoIdx + 1}` : "Not found";

          return (
            <label key={field} className="text-[11px] flex flex-col gap-1">
              <span className="font-mono text-muted-foreground">
                {field}
                {isRequired ? " *" : ""}
              </span>
              <span className="text-[10px] text-muted-foreground truncate" title={autoLabel}>
                Auto: {autoLabel}
                {auto.fuzzyFields.includes(field) ? " (fuzzy)" : ""}
              </span>
              <select
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                value={selected === "" ? "" : String(selected)}
                onChange={(e) => {
                  const v = e.target.value;
                  onOverride(field, v === "" ? undefined : Number(v));
                }}
              >
                <option value="">{isRequired ? "— Select column —" : "— Skip —"}</option>
                {rawHeaders.map((h, idx) => (
                  <option key={`${field}-${idx}`} value={idx}>
                    {h || `Column ${idx + 1}`}
                  </option>
                ))}
              </select>
              {effectiveIdx !== undefined && overrides[field] !== undefined && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Manual override</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
