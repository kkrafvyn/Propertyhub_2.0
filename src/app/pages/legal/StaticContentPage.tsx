import { Link, useLocation } from "react-router";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { getLegalDocument } from "./legal-documents";
import { LegalDocumentView } from "./LegalDocumentView";

const STATIC_SLUGS = new Set(["help", "safety", "cancellation", "about", "careers", "contact"]);

/** Renders support and company pages from shared legal content. */
export function StaticContentPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").split("/")[0] || "";
  const document = STATIC_SLUGS.has(slug) ? getLegalDocument(slug) : undefined;

  if (!document) {
    return (
      <DesktopShell minimal>
        <PageMeta title="Page not found" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
          <Link to="/" className="mt-6 inline-block text-brand-forest hover:underline">
            Back to home
          </Link>
        </div>
      </DesktopShell>
    );
  }

  return <LegalDocumentView document={document} />;
}
