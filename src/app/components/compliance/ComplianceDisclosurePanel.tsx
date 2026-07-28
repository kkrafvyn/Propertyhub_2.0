import { Shield } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { useTranslation } from "../../i18n/LocaleContext";
import {
  getJurisdictionRules,
  getListingComplianceChecklist,
  type JurisdictionId,
  type ListingType,
} from "../../../lib/real-estate-compliance";

interface ComplianceDisclosurePanelProps {
  jurisdictionId: JurisdictionId;
  listingType?: ListingType;
  compact?: boolean;
}

export function ComplianceDisclosurePanel({
  jurisdictionId,
  listingType = "sale",
  compact = false,
}: ComplianceDisclosurePanelProps) {
  const { t } = useTranslation();
  const rules = getJurisdictionRules(jurisdictionId);
  const checklist = getListingComplianceChecklist(jurisdictionId, listingType);

  return (
    <Card className={`border-surface-border bg-surface-subtle/30 ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Shield className="h-4 w-4 text-brand-forest" />
        <h3 className="font-semibold text-ink">
          {t("compliance.panel.title", { jurisdiction: rules.label })}
        </h3>
        <Badge variant="secondary">{rules.dataProtectionLaw}</Badge>
      </div>

      <p className="mb-4 text-sm text-ink-secondary">
        {t("compliance.panel.regulatedBy", {
          regulator: rules.realEstateRegulator,
          law: rules.governingLaw,
        })}
      </p>

      <div className="space-y-4 text-sm text-ink">
        <section>
          <h4 className="mb-2 font-medium">{t("compliance.panel.listingRequirements")}</h4>
          <ul className="list-disc space-y-1 pl-5 text-ink-secondary">
            {checklist.requiredDisclosures.slice(0, compact ? 3 : 8).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {!compact ? (
          <section>
            <h4 className="mb-2 font-medium">{t("compliance.panel.yourRights")}</h4>
            <ul className="list-disc space-y-1 pl-5 text-ink-secondary">
              {rules.consumerRights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
