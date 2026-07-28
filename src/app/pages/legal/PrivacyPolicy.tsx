import { useMemo } from "react";
import { Link } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { useTranslation } from "../../i18n/LocaleContext";
import { realEstateComplianceService } from "../../../lib/real-estate-compliance.service";

const DEFAULT_JURISDICTION = "GH";

export function PrivacyPolicy() {
  const { t } = useTranslation();
  const legal = realEstateComplianceService.getLegalContext(DEFAULT_JURISDICTION);

  const sections = useMemo(
    () => [
      { title: t("legal.privacy.collectTitle"), body: t("legal.privacy.collectBody") },
      { title: t("legal.privacy.useTitle"), body: t("legal.privacy.useBody") },
      { title: t("legal.privacy.shareTitle"), body: t("legal.privacy.shareBody") },
      { title: t("legal.privacy.securityTitle"), body: t("legal.privacy.securityBody") },
      { title: t("legal.privacy.rightsTitle"), body: t("legal.privacy.rightsBody") },
      { title: t("legal.privacy.contactTitle"), body: t("legal.privacy.contactBody") },
    ],
    [t]
  );

  return (
    <DesktopShell minimal>
      <PageMeta title={t("legal.privacy.title")} />
      <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="text-sm text-ink-secondary">{t("legal.lastUpdated")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{t("legal.privacy.title")}</h1>
        <p className="mt-4 text-ink-secondary">{t("legal.privacy.intro")}</p>
        <p className="mt-3 rounded-lg border border-surface-border bg-surface-subtle/40 p-3 text-sm text-ink-secondary">
          Primary jurisdiction: {legal.label} · {legal.dataProtectionLaw}
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
          <Link to="/terms" className="text-brand-forest hover:underline">
            Terms of Service
          </Link>
        </p>
      </article>
    </DesktopShell>
  );
}
