import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n/LocaleContext";
import {
  realEstateComplianceService,
  type JurisdictionId,
  type ListingType,
} from "../../../lib/real-estate-compliance.service";

interface ListingComplianceChecklistProps {
  jurisdictionId: JurisdictionId;
  listingType: ListingType;
  onValidated?: (valid: boolean) => void;
}

export function ListingComplianceChecklist({
  jurisdictionId,
  listingType,
  onValidated,
}: ListingComplianceChecklistProps) {
  const { t } = useTranslation();
  const confirmations = useMemo(
    () => realEstateComplianceService.getPublishConfirmations(listingType),
    [listingType]
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const rules = realEstateComplianceService.getJurisdictionRules(jurisdictionId);
  const checklist = realEstateComplianceService.getListingComplianceChecklist(
    jurisdictionId,
    listingType
  );

  const validation = realEstateComplianceService.validateListingCompliance({
    jurisdictionId,
    listingType,
    confirmations: checked,
  });

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    const result = realEstateComplianceService.validateListingCompliance({
      jurisdictionId,
      listingType,
      confirmations: next,
    });
    onValidated?.(result.valid);
  };

  return (
    <Card className="border-surface-border p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink">
          {t("compliance.checklist.title", { jurisdiction: rules.label })}
        </h3>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("compliance.checklist.subtitle", { regulator: rules.realEstateRegulator })}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-surface-border bg-white p-4">
        <p className="mb-2 text-sm font-medium text-ink">
          {t("compliance.checklist.requiredDisclosures")}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">
          {checklist.requiredDisclosures.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {confirmations.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={!!checked[item.id]}
              onChange={() => toggle(item.id)}
            />
            <span className="text-ink">{t(`compliance.confirmations.${item.id}`)}</span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        {validation.valid ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-brand-forest" />
            <span className="text-brand-forest">{t("compliance.checklist.complete")}</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-ink-secondary">
              {t("compliance.checklist.incomplete", { jurisdiction: rules.label })}
            </span>
          </>
        )}
      </div>

      {!validation.valid ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            const allChecked = Object.fromEntries(confirmations.map((item) => [item.id, true]));
            setChecked(allChecked);
            onValidated?.(true);
          }}
        >
          {t("compliance.checklist.confirmAll")}
        </Button>
      ) : null}
    </Card>
  );
}
