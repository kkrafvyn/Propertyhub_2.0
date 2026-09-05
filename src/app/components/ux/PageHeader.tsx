import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";

interface BreadcrumbItemConfig {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItemConfig[];
  actions?: ReactNode;
  filters?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  filters,
  badge,
}: PageHeaderProps) {
  return (
    <header className="app-page-header">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={`${crumb.label}-${index}`} className="contents">
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="font-medium text-ink">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href} className="text-ink-secondary hover:text-ink transition-colors">
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast ? <BreadcrumbSeparator className="text-ink-muted" /> : null}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="app-page-title">{title}</h1>
            {badge ? <div>{badge}</div> : null}
          </div>
          {description ? <p className="app-page-description">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1 lg:pt-0">
            {actions}
          </div>
        ) : null}
      </div>

      {filters ? (
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-surface-border/60">
          {filters}
        </div>
      ) : null}
    </header>
  );
}
