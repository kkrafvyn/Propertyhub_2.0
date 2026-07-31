import { Link } from "react-router";
import { useParams } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import {
  LEGAL_DOCUMENTS,
  LEGAL_LAST_UPDATED,
  SUPPORT_PAGES,
  getLegalDocument,
} from "./legal-documents";
import { LegalDocumentView } from "./LegalDocumentView";

export function LegalDocumentPage() {
  const { slug } = useParams<{ slug: string }>();
  const document = slug ? getLegalDocument(slug) : undefined;

  if (!document) {
    return (
      <DesktopShell minimal>
        <PageMeta title="Document not found" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-ink">Document not found</h1>
          <p className="mt-2 text-ink-secondary">This policy may have moved or does not exist.</p>
          <Link to="/legal" className="mt-6 inline-block text-brand-forest hover:underline">
            View all legal documents
          </Link>
        </div>
      </DesktopShell>
    );
  }

  return <LegalDocumentView document={document} />;
}

export function LegalHub() {
  return (
    <DesktopShell minimal>
      <PageMeta
        title="Legal & policies"
        description="BaytMiftah terms, privacy, marketplace rules, and trust policies."
      />
      <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="text-sm text-ink-secondary">Last updated: {LEGAL_LAST_UPDATED}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Legal & policies</h1>
        <p className="mt-4 text-ink-secondary">
          BaytMiftah operates as a neutral technology marketplace. These documents define the
          responsibilities of each party and the limits of our platform role.
        </p>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-ink">Core legal documents</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {LEGAL_DOCUMENTS.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    to={`/legal/${doc.slug}`}
                    className="block rounded-xl border border-surface-border bg-white p-4 transition hover:border-brand-forest/40 hover:shadow-sm"
                  >
                    <span className="font-medium text-ink">{doc.title}</span>
                    <p className="mt-1 text-sm text-ink-secondary line-clamp-2">{doc.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Support</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {SUPPORT_PAGES.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    to={`/${doc.slug}`}
                    className="rounded-full border border-surface-border px-4 py-2 text-sm text-ink-secondary transition hover:border-brand-forest hover:text-brand-forest"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/complaint"
                  className="rounded-full border border-brand-forest/40 bg-brand-forest/5 px-4 py-2 text-sm font-medium text-brand-forest transition hover:border-brand-forest"
                >
                  File a complaint
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </DesktopShell>
  );
}
