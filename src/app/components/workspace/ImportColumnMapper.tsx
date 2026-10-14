import {
  canonicalFieldsForImportType,
  mapHeaders,
  type ImportTypeKey,
} from "../../../lib/import-column-mapping";

type Props = {
  importType: ImportTypeKey;
  rawHeaders: string[];
  manualMapping: Record<string, number>;
  onChange: (mapping: Record<string, number>) => void;
};

export function ImportColumnMapper({ importType, rawHeaders, manualMapping, onChange }: Props) {
  const auto = mapHeaders(rawHeaders, importType);
  const fields = canonicalFieldsForImportType(importType).filter(
    (f) => auto.missing.includes(f) || manualMapping[f] !== undefined,
  );

  if (fields.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Map columns</p>
      <p className="text-[11px] text-muted-foreground">
        Some headers were not recognized. Choose which file column matches each field.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className="text-[11px] flex flex-col gap-1">
            <span className="font-mono text-muted-foreground">{field}</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              value={manualMapping[field] ?? ""}
              onChange={(e) => {
                const idx = e.target.value === "" ? undefined : Number(e.target.value);
                const next = { ...manualMapping };
                if (idx === undefined) delete next[field];
                else next[field] = idx;
                onChange(next);
              }}
            >
              <option value="">— Select column —</option>
              {rawHeaders.map((h, idx) => (
                <option key={`${field}-${idx}`} value={idx}>
                  {h || `Column ${idx + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
