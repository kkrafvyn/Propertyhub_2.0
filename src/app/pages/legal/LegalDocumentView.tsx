import { Link } from "react-router";
import { Printer } from "lucide-react";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { useTranslation } from "../../i18n/LocaleContext";
import {
  LEGAL_LAST_UPDATED,
  type LegalDocument,
  type LegalSection,
  getRelatedDocuments,
} from "./legal-documents";

function SectionBlock({ section }: { section: LegalSection }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
      {section.body ? (
        <p className="mt-2 leading-relaxed text-ink-secondary">{section.body}</p>
      ) : null}
      {section.bullets?.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-secondary">
          {section.bullets.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  const related = getRelatedDocuments(document.relatedSlugs);
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <DesktopShell minimal>
      <PageMeta title={document.title} description={document.summary} />
      <div className="legal-document-print mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/legal" className="text-sm text-brand-forest hover:underline">
            ← {t("legal.hub.allPolicies")}
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-ink hover:bg-surface-subtle"
          >
            <Printer className="h-4 w-4" />
            {t("legal.print")}
          </button>
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            <p className="text-sm text-ink-secondary">Last updated: {LEGAL_LAST_UPDATED}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{document.title}</h1>
            <p className="mt-4 text-lg text-ink-secondary">{document.summary}</p>

            <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950 print:border-gray-300 print:bg-white">
              <strong>Important:</strong> These documents are provided for transparency and do not
              constitute legal advice. BaytMiftah recommends review by qualified counsel experienced
              in technology, real estate, payments, and Ghanaian commercial law before relying on
              them for high-value transactions.
            </div>

            <div className="mt-10 space-y-8">
              {document.sections.map((section) => (
                <SectionBlock key={section.title} section={section} />
              ))}
            </div>

            <p className="mt-10 text-sm text-ink-secondary">
              <Link to="/legal" className="text-brand-forest hover:underline">
                ← All legal documents
              </Link>
            </p>
          </article>

          {related.length > 0 ? (
            <aside className="lg:sticky lg:top-24 lg:self-start print:hidden">
              <div className="rounded-xl border border-surface-border bg-surface-subtle/40 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">Related</h2>
                <ul className="mt-3 space-y-2">
                  {related.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        to={`/legal/${doc.slug}`}
                        className="text-sm text-brand-forest hover:underline"
                      >
                        {doc.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </DesktopShell>
  );
}
