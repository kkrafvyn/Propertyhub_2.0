import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";

import { Download, MapPin, Shield } from "lucide-react";

import { Card } from "../../components/ui/Card";

import { Badge } from "../../components/ui/badge";

import { Button } from "../../components/ui/Button";

import { useTranslation } from "../../i18n/LocaleContext";

import {

  realEstateComplianceService,

  type JurisdictionId,

} from "../../../lib/real-estate-compliance.service";

import { countryRulesService } from "../../../lib/country-rules.service";

import {

  listCountryPacks,

  SUBDIVISION_OPTIONS,

  subdivisionLabel,

} from "../../../lib/country-rules";



interface ComplianceCenterProps {

  organizationId: string;

  defaultJurisdiction?: JurisdictionId;

}



export function ComplianceCenter({

  organizationId,

  defaultJurisdiction,

}: ComplianceCenterProps) {

  const { t } = useTranslation();

  const [activeJurisdiction, setActiveJurisdiction] = useState<JurisdictionId>(defaultJurisdiction || "GH");

  const [subdivision, setSubdivision] = useState("");

  const [orgSettings, setOrgSettings] = useState<any>(null);



  useEffect(() => {

    void countryRulesService.getOrganizationSettings(organizationId).then((settings) => {

      setOrgSettings(settings);

      if (settings?.default_jurisdiction) {

        setActiveJurisdiction(settings.default_jurisdiction as JurisdictionId);

      }

      if (settings?.default_subdivision) {

        setSubdivision(settings.default_subdivision);

      }

    });

  }, [organizationId]);



  const jurisdictions = useMemo(

    () => realEstateComplianceService.listSupportedJurisdictions(),

    []

  );



  const countryPacks = useMemo(() => listCountryPacks(), []);

  const subdivisionOptions = SUBDIVISION_OPTIONS[activeJurisdiction] ?? [];

  const regionLabel = subdivisionLabel(activeJurisdiction, subdivision);



  const countryContext = useMemo(

    () =>

      countryRulesService.resolveContext({

        organizationJurisdiction: activeJurisdiction,

        subdivisionCode: subdivision || undefined,

      }),

    [activeJurisdiction, subdivision]

  );



  const defaultRules = useMemo(

    () => realEstateComplianceService.getJurisdictionRules(activeJurisdiction),

    [activeJurisdiction]

  );



  const downloadCompliancePack = () => {

    const checklist = realEstateComplianceService.getListingComplianceChecklist(

      activeJurisdiction,

      "sale"

    );

    const content = [

      `# Compliance pack — ${defaultRules.label}${regionLabel ? ` (${regionLabel})` : ""}`,

      "",

      `Data protection: ${defaultRules.dataProtectionLaw}`,

      `Regulator: ${defaultRules.realEstateRegulator}`,

      `Governing law: ${defaultRules.governingLaw}`,

      "",

      "## Lease rules (effective)",

      ...(countryContext.pack.leaseRules.maxSecurityDepositMonths != null

        ? [`- Max security deposit: ${countryContext.pack.leaseRules.maxSecurityDepositMonths} months`]

        : []),

      ...(countryContext.pack.leaseRules.maxAdvanceRentMonths != null

        ? [`- Max advance rent: ${countryContext.pack.leaseRules.maxAdvanceRentMonths} months`]

        : []),

      ...countryContext.pack.leaseRules.statutoryReferences.map((r) => `- ${r}`),

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

    link.download = `compliance-pack-${activeJurisdiction.toLowerCase()}${subdivision ? `-${subdivision.toLowerCase()}` : ""}.md`;

    link.click();

    URL.revokeObjectURL(url);

  };



  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold text-ink">{t("compliance.center.title")}</h1>

        <p className="mt-1 text-ink-secondary">

          {t("compliance.center.subtitle")}

        </p>

      </div>



      <Card className="border-brand-forest/20 bg-brand-forest/5 p-5">

        <div className="flex flex-wrap items-start justify-between gap-3">

          <div className="flex items-start gap-3">

            <Shield className="mt-0.5 h-5 w-5 text-brand-forest" />

            <div>

              <h2 className="font-semibold text-ink">

                {t("compliance.center.defaultMarket", { code: activeJurisdiction })}

                {regionLabel ? ` · ${regionLabel}` : ""}

              </h2>

              <p className="mt-1 text-sm text-ink-secondary">

                {t("compliance.center.defaultMarketBody")} Configure markets in International Markets.

              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                {countryPacks.map((p) => (

                  <Button

                    key={p.jurisdictionId}

                    size="sm"

                    variant={activeJurisdiction === p.jurisdictionId ? "default" : "outline"}

                    onClick={() => {

                      setActiveJurisdiction(p.jurisdictionId);

                      setSubdivision("");

                    }}

                  >

                    {p.label}

                  </Button>

                ))}

              </div>

              {subdivisionOptions.length > 0 && (

                <div className="mt-3 flex items-center gap-2">

                  <MapPin className="h-4 w-4 text-brand-forest" />

                  <NativeSelectControl

                    className="rounded-lg border px-3 py-1.5 text-sm"

                    value={subdivision}

                    onChange={(e) => setSubdivision(e.target.value)}

                  >

                    <option value="">National default</option>

                    {subdivisionOptions.map((s) => (

                      <option key={s.code} value={s.code}>{s.label}</option>

                    ))}

                  </NativeSelectControl>

                  {orgSettings?.default_subdivision === subdivision && subdivision ? (

                    <Badge variant="outline">Org default</Badge>

                  ) : null}

                </div>

              )}

            </div>

          </div>

          <Button size="sm" variant="outline" onClick={downloadCompliancePack}>

            <Download className="w-4 h-4 mr-2" />

            Download pack

          </Button>

        </div>

      </Card>



      {countryContext.pack.leaseRules.statutoryReferences.length > 0 && (

        <Card className="p-5">

          <h3 className="mb-2 text-lg font-semibold text-ink">

            Effective lease rules{regionLabel ? ` — ${regionLabel}` : ""}

          </h3>

          <div className="mb-3 flex flex-wrap gap-2 text-sm">

            {countryContext.pack.leaseRules.maxSecurityDepositMonths != null && (

              <Badge variant="outline">Deposit cap: {countryContext.pack.leaseRules.maxSecurityDepositMonths} mo</Badge>

            )}

            {countryContext.pack.leaseRules.maxAdvanceRentMonths != null && (

              <Badge variant="outline">Advance rent: {countryContext.pack.leaseRules.maxAdvanceRentMonths} mo</Badge>

            )}

            {countryContext.pack.leaseRules.rentControlApplies && (

              <Badge variant="outline">Rent control may apply</Badge>

            )}

          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">

            {countryContext.pack.leaseRules.statutoryReferences.slice(0, 6).map((r) => (

              <li key={r}>{r}</li>

            ))}

          </ul>

        </Card>

      )}



      <div className="grid gap-4 lg:grid-cols-2">

        {jurisdictions.map((rules) => (

          <Card key={rules.id} className="p-5">

            <div className="mb-3 flex flex-wrap items-center gap-2">

              <h3 className="text-lg font-semibold text-ink">{rules.label}</h3>

              {rules.id === activeJurisdiction ? (

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

