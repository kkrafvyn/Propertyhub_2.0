import { useMemo } from "react";
import { Link } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { useTranslation } from "../../i18n/LocaleContext";
import { realEstateComplianceService } from "../../../lib/real-estate-compliance.service";

const DEFAULT_JURISDICTION = "GH";

export function TermsOfService() {
  const { t } = useTranslation();
  const legal = realEstateComplianceService.getLegalContext(DEFAULT_JURISDICTION);

  const sections = useMemo(
    () => [
      { title: t("legal.terms.acceptanceTitle"), body: t("legal.terms.acceptanceBody") },
      { title: t("legal.terms.listingsTitle"), body: t("legal.terms.listingsBody") },
      { title: t("legal.terms.paymentsTitle"), body: t("legal.terms.paymentsBody") },
      { title: t("legal.terms.accountsTitle"), body: t("legal.terms.accountsBody") },
      { title: t("legal.terms.liabilityTitle"), body: t("legal.terms.liabilityBody") },
      { title: t("legal.terms.lawTitle"), body: t("legal.terms.lawBody") },
    ],
    [t]
  );

  return (
    <DesktopShell minimal>
      <PageMeta title={t("legal.terms.title")} />
      <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="text-sm text-ink-secondary">{t("legal.lastUpdated")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{t("legal.terms.title")}</h1>
        <p className="mt-4 text-ink-secondary">{t("legal.terms.intro")}</p>
        <p className="mt-3 rounded-lg border border-surface-border bg-surface-subtle/40 p-3 text-sm text-ink-secondary">
          Governing law: {legal.governingLaw} · Regulator: {legal.realEstateRegulator}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-secondary">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-secondary">
          <Link to="/privacy" className="text-brand-forest hover:underline">
            Privacy Policy
          </Link>
        </p>
      </article>
    </DesktopShell>
  );
}
