import { Link } from "react-router";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { MarketingSubpage } from "../../components/marketing/MarketingSubpage";
import { isMarketingSite } from "../../../lib/site-mode";
import {
  LEGAL_CATEGORIES,
  getAdjacentPolicies,
  getLegalPath,
  getRelatedDocuments,
  type LegalDocument,
} from "../../../content/legal";
import {
  LegalArticleHeader,
  LegalCentreShell,
  LegalPrevNext,
  LegalSectionBlock,
} from "../../components/legal/LegalPageLayout";
import { LegalRelatedPolicies, LegalContactCard } from "../../components/legal/LegalRelatedPolicies";
import { LegalTableOfContents } from "../../components/legal/LegalTableOfContents";
import { openCookiePreferences } from "../../components/legal/CookieConsentBanner";
import { ComplaintFormPanel } from "./ComplaintForm";

function categoryLabel(document: LegalDocument) {
  if (document.category === "company") return "Company";
  if (document.category === "support") return "Support";
  return LEGAL_CATEGORIES.find((category) => category.id === document.category)?.label ?? "Legal";
}

export function LegalDocumentView({
  document,
  surface = "app",
}: {
  document: LegalDocument;
  surface?: "app" | "marketing";
}) {
  const related = getRelatedDocuments(document.relatedPolicies);
  const { previous, next } = getAdjacentPolicies(document.slug);
  const category = categoryLabel(document);
  const path = getLegalPath(document.slug);
  const inLegalCentre = document.category !== "support" && document.category !== "company";

  const article = (
    <article>
      <LegalArticleHeader document={document} categoryLabel={category} />

      {inLegalCentre ? (
        <div className="mt-6 xl:hidden print:hidden">
          <LegalTableOfContents sections={document.sections} />
        </div>
      ) : null}

      <div className="mt-10 space-y-10">
        {document.sections.map((section) => (
          <LegalSectionBlock key={section.heading} section={section} />
        ))}
      </div>

      {document.showCookieControls ? (
        <div className="mt-8 print:hidden">
          <button
            type="button"
            onClick={() => openCookiePreferences()}
            className="rounded-lg bg-brand-forest px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
          >
            Manage cookie preferences
          </button>
        </div>
      ) : null}

      {document.showComplaintForm ? (
        <div className="mt-12 print:hidden">
          <h2 className="text-xl font-semibold text-ink">Submit a complaint</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Use the form below or email complaints@baytmiftah.com.
          </p>
          <div className="mt-6">
            <ComplaintFormPanel embedded />
          </div>
        </div>
      ) : null}

      <div className="mt-12 space-y-8 print:hidden">
        <LegalRelatedPolicies documents={related} />
        {inLegalCentre ? (
          <div className="xl:hidden">
            <LegalContactCard />
          </div>
        ) : (
          <LegalContactCard />
        )}
      </div>

      {inLegalCentre ? <LegalPrevNext previous={previous} next={next} /> : null}

      <p className="mt-10 text-sm text-ink-secondary print:hidden">
        <Link to="/legal" className="text-brand-forest hover:underline">
          ← All policies
        </Link>
      </p>
    </article>
  );


  if (surface === "marketing") {
    return (
      <MarketingSubpage>
        <PageMeta
          title={document.seoTitle}
          description={document.seoDescription}
          canonicalPath={path}
          ogTitle={document.seoTitle}
          ogDescription={document.seoDescription}
        />
        <div className="mk-legal-body">{article}</div>
      </MarketingSubpage>
    );
  }

  if (!inLegalCentre) {
    return (
      <DesktopShell minimal showFooter>
        <PageMeta
          title={document.seoTitle}
          description={document.seoDescription}
          canonicalPath={path}
          ogTitle={document.seoTitle}
          ogDescription={document.seoDescription}
        />
        <div className="legal-document-print mx-auto max-w-3xl py-6 md:py-10">{article}</div>
      </DesktopShell>
    );
  }

  return (
    <LegalCentreShell
      title={document.seoTitle}
      description={document.seoDescription}
      canonicalPath={path}
      currentSlug={document.slug}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Legal", to: "/legal" },
        { label: document.title },
      ]}
      tocSections={document.sections}
    >
      {article}
    </LegalCentreShell>
  );
}
