import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; to?: string };

export function LegalBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-ink-secondary">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="rounded-sm text-brand-forest underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-ink" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
