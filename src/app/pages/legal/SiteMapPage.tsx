import { Link } from "react-router";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { MarketingSubpage } from "../../components/marketing/MarketingSubpage";
import { isMarketingSite } from "../../../lib/site-mode";
import { SITE_MAP_SECTIONS } from "../../../content/site-links";

function SitemapContent() {
  return (
    <article>
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-brand-forest">Site map</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">Sitemap</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-secondary">
          Browse every public area of BaytMiftah — marketplace search, help, hosting tools, your
          account, company pages, and legal policies.
        </p>
      </header>

      <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_MAP_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-4 text-sm font-semibold text-ink">{section.title}</h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-secondary transition hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}

export function SiteMapPage() {
  if (isMarketingSite()) {
    return (
      <MarketingSubpage>
        <PageMeta title="Sitemap" description="Browse all BaytMiftah pages and policies." />
        <SitemapContent />
      </MarketingSubpage>
    );
  }

  return (
    <DesktopShell minimal showFooter>
      <PageMeta title="Sitemap" description="Browse all BaytMiftah pages and policies." />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <SitemapContent />
      </div>
    </DesktopShell>
  );
}
