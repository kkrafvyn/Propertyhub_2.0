import { Link, useLocation } from "react-router";
import { getLegalPath, getPoliciesByCategory, type LegalDocument } from "../../../content/legal";

export function LegalSidebar({ currentSlug }: { currentSlug?: string }) {
  const location = useLocation();
  const groups = getPoliciesByCategory();

  return (
    <nav aria-label="Legal policies" className="space-y-6">
      <Link
        to="/legal"
        className={`block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest ${
          location.pathname === "/legal"
            ? "bg-brand-forest/10 text-brand-forest"
            : "text-ink-secondary hover:bg-surface-subtle hover:text-ink"
        }`}
      >
        All policies
      </Link>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">{group.label}</p>
          <ul className="mt-2 space-y-0.5">
            {group.documents.map((doc: LegalDocument) => {
              const active = currentSlug === doc.slug;
              return (
                <li key={doc.slug}>
                  <Link
                    to={getLegalPath(doc.slug)}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest ${
                      active
                        ? "bg-brand-forest/10 font-medium text-brand-forest"
                        : "text-ink-secondary hover:bg-surface-subtle hover:text-ink"
                    }`}
                  >
                    {doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
