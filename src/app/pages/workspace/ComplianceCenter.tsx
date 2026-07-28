import { useMemo } from "react";
import { Download, Shield } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { useTranslation } from "../../i18n/LocaleContext";
import {
  realEstateComplianceService,
  type JurisdictionId,
} from "../../../lib/real-estate-compliance.service";

interface ComplianceCenterProps {
  organizationId: string;
  defaultJurisdiction?: JurisdictionId;
}

export function ComplianceCenter({
  organizationId,
  defaultJurisdiction = "GH",
}: ComplianceCenterProps) {
  const { t } = useTranslation();
  const jurisdictions = useMemo(
    () => realEstateComplianceService.listSupportedJurisdictions(),
    []
  );

  const defaultRules = useMemo(
    () => realEstateComplianceService.getJurisdictionRules(defaultJurisdiction),
    [defaultJurisdiction]
  );

  const downloadCompliancePack = () => {
    const checklist = realEstateComplianceService.getListingComplianceChecklist(
      defaultJurisdiction,
      "sale"
    );
    const content = [
      `# Compliance pack — ${defaultRules.label}`,
      "",
      `Data protection: ${defaultRules.dataProtectionLaw}`,
      `Regulator: ${defaultRules.realEstateRegulator}`,
      `Governing law: ${defaultRules.governingLaw}`,
      "",
      "## Listing disclosures",
      ...defaultRules.listingDisclosures.map((item) => `- ${item}`),
      "",
      "## Sale checklist",
      ...checklist.requiredDisclosures.map((item) => `- ${item}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `compliance-pack-${defaultJurisdiction.toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">{t("compliance.center.title")}</h1>
        <p className="mt-1 text-ink-secondary">
          {t("compliance.center.subtitle")}{" "}
          {t("compliance.center.organization", { id: organizationId })}
        </p>
      </div>

      <Card className="border-brand-forest/20 bg-brand-forest/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-brand-forest" />
            <div>
              <h2 className="font-semibold text-ink">
                {t("compliance.center.defaultMarket", { code: defaultJurisdiction })}
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {t("compliance.center.defaultMarketBody")}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={downloadCompliancePack}>
            <Download className="w-4 h-4 mr-2" />
            Download pack
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {jurisdictions.map((rules) => (
          <Card key={rules.id} className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-ink">{rules.label}</h3>
              {rules.id === defaultJurisdiction ? (
                <Badge>{t("compliance.center.primary")}</Badge>
              ) : null}
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-ink">{t("compliance.center.dataProtection")}</dt>
                <dd className="text-ink-secondary">{rules.dataProtectionLaw}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">{t("compliance.center.regulator")}</dt>
                <dd className="text-ink-secondary">{rules.realEstateRegulator}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">{t("compliance.center.governingLaw")}</dt>
                <dd className="text-ink-secondary">{rules.governingLaw}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">{t("compliance.center.amlKyc")}</dt>
                <dd className="text-ink-secondary">
                  {rules.amlKycRequired
                    ? t("compliance.center.required")
                    : t("compliance.center.recommended")}
                  {rules.agencyLicenseRequired
                    ? ` · ${t("compliance.center.agencyLicenseRequired")}`
                    : ""}
                </dd>
              </div>
            </dl>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
              {rules.listingDisclosures.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ComplianceCenter;

