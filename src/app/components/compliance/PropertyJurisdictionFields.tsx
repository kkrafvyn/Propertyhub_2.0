import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo } from "react";
import { MapPin, Scale } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  SUBDIVISION_OPTIONS,
  subdivisionLabel,
} from "../../../lib/country-rules";
import { resolveSubdivisionCode } from "../../../lib/country-rules/subdivision-resolver";
import { resolveJurisdiction } from "../../../lib/real-estate-compliance";
import { buildPropertyComplianceSnapshot } from "../../../lib/property-country-context.service";
import type { CountryCode } from "../../../lib/country-rules";

export type PropertyJurisdictionFieldValues = {
  country: string;
  region: string;
  city: string;
  subdivisionCode: string;
  currency: string;
};

interface PropertyJurisdictionFieldsProps {
  values: PropertyJurisdictionFieldValues;
  onChange: (patch: Partial<PropertyJurisdictionFieldValues>) => void;
  orgJurisdiction?: CountryCode | null;
  orgSubdivision?: string | null;
  orgCurrency?: string | null;
}

export function PropertyJurisdictionFields({
  values,
  onChange,
  orgJurisdiction,
  orgSubdivision,
  orgCurrency,
}: PropertyJurisdictionFieldsProps) {
  const jurisdictionId = useMemo(
    () =>
      orgJurisdiction ||
      resolveJurisdiction({
        country: values.country,
        region: values.region,
        city: values.city,
      }),
    [orgJurisdiction, values.country, values.region, values.city]
  );

  const subdivisionOptions = SUBDIVISION_OPTIONS[jurisdictionId] ?? [];

  const autoSubdivision = useMemo(
    () => resolveSubdivisionCode(jurisdictionId, values.region, values.city),
    [jurisdictionId, values.region, values.city]
  );

  useEffect(() => {
    if (values.subdivisionCode || !autoSubdivision) return;
    onChange({ subdivisionCode: autoSubdivision });
  }, [autoSubdivision, values.subdivisionCode, onChange]);

  const snapshot = useMemo(
    () =>
      buildPropertyComplianceSnapshot(
        {
          country: values.country,
          region: values.region,
          city: values.city,
          subdivision_code: values.subdivisionCode || autoSubdivision,
          currency: values.currency,
        },
        {
          default_jurisdiction: orgJurisdiction,
          default_subdivision: orgSubdivision,
          default_currency: orgCurrency,
        }
      ),
    [
      values.country,
      values.region,
      values.city,
      values.subdivisionCode,
      values.currency,
      autoSubdivision,
      orgJurisdiction,
      orgSubdivision,
      orgCurrency,
    ]
  );

  const effectiveCode = values.subdivisionCode || autoSubdivision || "";
  const effectiveLabel = effectiveCode
    ? subdivisionLabel(jurisdictionId, effectiveCode)
    : undefined;

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-brand-forest" />
        <h3 className="text-sm font-semibold text-ink">Property jurisdiction rules</h3>
        <Badge variant="secondary">{snapshot.context.pack.label}</Badge>
        {effectiveLabel ? <Badge variant="outline">{effectiveLabel}</Badge> : null}
        {snapshot.subdivisionSource === "property" && values.subdivisionCode ? (
          <Badge variant="outline">Manual override</Badge>
        ) : snapshot.subdivisionSource === "address" ? (
          <Badge variant="outline">Auto from address</Badge>
        ) : null}
      </div>

      {subdivisionOptions.length > 0 ? (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-xs font-medium text-ink-secondary flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Sub-national region
          </label>
          <NativeSelectControl
            className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm max-w-md"
            value={values.subdivisionCode}
            onChange={(e) => {
              const code = e.target.value;
              onChange({
                subdivisionCode: code,
                currency: snapshot.context.currency,
              });
            }}
          >
            <option value="">
              {autoSubdivision
                ? `Auto: ${subdivisionLabel(jurisdictionId, autoSubdivision) || autoSubdivision}`
                : "National default"}
            </option>
            {subdivisionOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </NativeSelectControl>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 text-xs text-ink-secondary">
        <div>
          <p className="font-medium text-ink mb-1">Lease highlights</p>
          {snapshot.leaseHighlights.length ? (
            <ul className="list-disc pl-4 space-y-0.5">
              {snapshot.leaseHighlights.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>National lease rules apply.</p>
          )}
        </div>
        <div>
          <p className="font-medium text-ink mb-1">Payments & tax</p>
          <p>{snapshot.paymentLabel}</p>
          {snapshot.taxComponents.slice(0, 3).map((t) => (
            <p key={t.id}>
              {t.label}
              {t.rateBasisPoints > 0 ? `: ${(t.rateBasisPoints / 100).toFixed(2)}%` : ""}
              {t.notes ? ` — ${t.notes}` : ""}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
