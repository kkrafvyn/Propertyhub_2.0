import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MobileCard<T extends ElementType = "div">({
  children,
  className = "",
  as,
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: T;
} & ComponentPropsWithoutRef<T>) {
  const Tag = as || "div";
  return (
    <Tag className={`rounded-2xl bg-bolt-card p-4 shadow-bolt-card ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function MobileStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <MobileCard>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </MobileCard>
  );
}

export function MobilePrimaryButton<T extends ElementType = "button">({
  children,
  className = "",
  as,
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: T;
} & ComponentPropsWithoutRef<T>) {
  const Tag = as || "button";
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-xl bg-mobile-forest px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function MobileSecondaryButton<T extends ElementType = "button">({
  children,
  className = "",
  as,
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: T;
} & ComponentPropsWithoutRef<T>) {
  const Tag = as || "button";
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-xl border border-surface-border bg-bolt-card px-5 py-3 text-sm font-semibold text-ink active:scale-[0.99] ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function MobileLinkRow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl bg-bolt-card px-4 py-4 font-semibold text-ink shadow-bolt-card active:scale-[0.99]"
    >
      {children}
      <ChevronRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}

export function MobileBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "danger";
}) {
  const tones = {
    neutral: "bg-bolt-bg text-ink",
    accent: "bg-mobile-forest/10 text-mobile-forest",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

export function MobileEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-bolt-card px-6 py-12 text-center shadow-bolt-card">
      <p className="font-bold text-ink">{title}</p>
      {description && <p className="mt-2 text-sm text-ink-secondary">{description}</p>}
      {action}
    </div>
  );
}

export function MobileSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[20px] font-bold tracking-tight text-ink">{children}</h2>;
}

export function MobileTextLink({
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
      className={`inline-flex items-center gap-1 text-sm font-semibold text-mobile-forest ${className}`}
    >
      {arrow === "left" && <ChevronLeft className="h-3.5 w-3.5 shrink-0 rtl-flip" />}
      {children}
      {arrow === "right" && <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl-flip" />}
    </Link>
  );
}

export function MobileHubTile({
  to,
  label,
  desc,
  icon,
}: {
  to: string;
  label: string;
  desc?: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-2xl bg-bolt-card p-4 shadow-bolt-card active:scale-[0.99]"
    >
      {icon && <div className="text-mobile-forest">{icon}</div>}
      <p className="font-semibold text-ink">{label}</p>
      {desc && <p className="text-sm text-ink-secondary">{desc}</p>}
    </Link>
  );
}

export function MobileShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const bottomPad = hideNav ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]";

  return (
    <div
      className={`mobile-bolt min-h-screen min-h-[100dvh] w-full overflow-x-clip bg-bolt-bg ${bottomPad} pt-[env(safe-area-inset-top,0px)] text-ink`}
    >
      <div className="mx-auto w-full min-w-0 max-w-lg sm:max-w-xl lg:max-w-2xl">{children}</div>
    </div>
  );
}
