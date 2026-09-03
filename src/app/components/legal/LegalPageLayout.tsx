import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { DesktopShell } from "../baytmiftah/DesktopShell";
import { PageMeta } from "../baytmiftah/PageMeta";
import { LegalBreadcrumbs } from "./LegalBreadcrumbs";
import { LegalSidebar } from "./LegalSidebar";
import { LegalTableOfContents } from "./LegalTableOfContents";
import { LegalContactCard } from "./LegalRelatedPolicies";
import {
  getLegalPath,
  getSectionId,
  type LegalDocument,
  type LegalSection,
} from "../../../content/legal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

export function LegalCentreShell({
  title,
  description,
  canonicalPath,
  currentSlug,
  breadcrumbs,
  children,
  tocSections,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  currentSlug?: string;
  breadcrumbs: { label: string; to?: string }[];
  children: ReactNode;
  tocSections?: LegalSection[];
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <DesktopShell minimal showFooter>
      <PageMeta
        title={title}
        description={description}
        canonicalPath={canonicalPath}
        ogTitle={title}
        ogDescription={description}
      />
      <a
        href="#legal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to legal content
      </a>
      <div className="legal-document-print mx-auto max-w-[var(--max-width-page)] px-0 py-6 md:py-10">
        <div className="mb-6 print:hidden">
          <LegalBreadcrumbs items={breadcrumbs} />
        </div>

        <div className="lg:hidden print:hidden">
          <Collapsible open={navOpen} onOpenChange={setNavOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-3 text-left text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest">
              Policy index
              <ChevronDown className={`h-4 w-4 transition ${navOpen ? "rotate-180" : ""}`} aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-xl border border-surface-border bg-surface p-4">
              <LegalSidebar currentSlug={currentSlug} />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_220px]">
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
              <LegalSidebar currentSlug={currentSlug} />
            </div>
          </aside>

          <div id="legal-main" className="min-w-0">
            {children}
          </div>

          <aside className="hidden xl:block print:hidden">
            <div className="sticky top-24 space-y-8">
              {tocSections?.length ? <LegalTableOfContents sections={tocSections} /> : null}
              <LegalContactCard />
            </div>
          </aside>
        </div>
      </div>
    </DesktopShell>
  );
}

export function LegalArticleHeader({
  document,
  categoryLabel,
}: {
  document: LegalDocument;
  categoryLabel?: string;
}) {
  return (
    <header className="border-b border-surface-border pb-8">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-forest">
        {categoryLabel ?? "Legal"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">{document.title}</h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-secondary">{document.description}</p>
    </header>
  );
}

export function LegalSectionBlock({ section }: { section: LegalSection }) {
  const id = getSectionId(section.heading);

  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-semibold text-ink">{section.heading}</h2>
      {section.content ? (
        <p className="mt-3 leading-relaxed text-ink-secondary">{section.content}</p>
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

export function LegalPrevNext({
  previous,
  next,
}: {
  previous?: LegalDocument;
  next?: LegalDocument;
}) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Previous and next policies"
      className="mt-12 grid gap-3 border-t border-surface-border pt-8 sm:grid-cols-2 print:hidden"
    >
      {previous ? (
        <Link
          to={getLegalPath(previous.slug)}
          className="rounded-xl border border-surface-border p-4 text-sm hover:border-brand-forest/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
        >
          <span className="block text-xs uppercase tracking-wide text-ink-secondary">Previous</span>
          <span className="mt-1 block font-medium text-ink">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={getLegalPath(next.slug)}
          className="rounded-xl border border-surface-border p-4 text-right text-sm hover:border-brand-forest/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
        >
          <span className="block text-xs uppercase tracking-wide text-ink-secondary">Next</span>
          <span className="mt-1 block font-medium text-ink">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

