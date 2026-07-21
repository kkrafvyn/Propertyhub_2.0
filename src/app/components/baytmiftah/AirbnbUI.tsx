import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const inputClass =
  "w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-sm text-ink outline-none transition focus:border-ink";

export const selectClass =
  "w-full rounded-lg border border-surface-border bg-transparent px-4 py-3 text-sm text-ink outline-none transition focus:border-ink";

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-surface-border pb-6">
      <div>
        {title && <h1 className="section-heading">{title}</h1>}
        {subtitle && <p className="mt-2 text-base text-ink-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel-card p-5">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const colClass =
    {
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-2 lg:grid-cols-3",
      4: "sm:grid-cols-2 lg:grid-cols-4",
      5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    }[cols] || "sm:grid-cols-2 lg:grid-cols-4";

  return <div className={`mb-8 grid gap-4 ${colClass}`}>{children}</div>;
}

export function PanelCard({
  title,
  children,
  footer,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel-card overflow-hidden ${className}`}>
      {title && (
        <div className="border-b border-surface-border px-5 py-4">
          <h3 className="font-semibold text-ink">{title}</h3>
        </div>
      )}
      <div className={title || footer ? "p-5" : ""}>{children}</div>
      {footer && <div className="border-t border-surface-border px-5 py-4">{footer}</div>}
    </div>
  );
}

export function ItemCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`panel-card p-4 ${className}`}>{children}</article>;
}

export function HubLinkCard({ to, label, desc }: { to: string; label: string; desc?: string }) {
  return (
    <Link to={to} className="hub-link-card group">
      <p className="font-semibold text-ink group-hover:underline">{label}</p>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{desc}</p>}
    </Link>
  );
}

export function HubLinkGrid({ links }: { links: Array<{ to: string; label: string; desc?: string }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((item) => (
        <HubLinkCard key={item.to} {...item} />
      ))}
    </div>
  );
}

export function DataRow({
  primary,
  secondary,
  meta,
  action,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-surface-border py-3.5 text-sm last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{primary}</p>
        {secondary && <p className="truncate text-ink-secondary">{secondary}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta && <span className="text-ink-secondary">{meta}</span>}
        {action}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-surface-hover text-ink",
    accent: "bg-brand-accent/10 text-brand-accent",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
}) {
  const tones = {
    info: "border-surface-border bg-surface-subtle text-ink-secondary",
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <p className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.info}`}>
      {children}
    </p>
  );
}

export function TablePanel({ children }: { children: ReactNode }) {
  return (
    <div className="panel-card overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function MediaCard({
  image,
  title,
  subtitle,
  badge,
  children,
  className = "",
}: {
  image?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <ItemCard className={`flex gap-4 ${className}`}>
      {image && (
        <img src={image} alt="" className="h-24 w-32 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        {badge && <div className="mb-1">{badge}</div>}
        <h2 className="font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        {children}
      </div>
    </ItemCard>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

type ButtonProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<T>;

export function PrimaryButton<T extends ElementType = "button">({
  children,
  className = "",
  as,
  ...props
}: ButtonProps<T>) {
  const Tag = as || "button";
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-lg bg-brand-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function SecondaryButton<T extends ElementType = "button">({
  children,
  className = "",
  as,
  ...props
}: ButtonProps<T>) {
  const Tag = as || "button";
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-lg border border-ink px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-surface-hover disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-card px-8 py-16 text-center">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-2 text-ink-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function TextLink({
  to,
  children,
  className = "",
  arrow,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  arrow?: "left" | "right";
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 text-sm font-semibold text-ink underline ${className}`}
    >
      {arrow === "left" && <ChevronLeft className="h-3.5 w-3.5 shrink-0 rtl-flip" />}
      {children}
      {arrow === "right" && <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl-flip" />}
    </Link>
  );
}
