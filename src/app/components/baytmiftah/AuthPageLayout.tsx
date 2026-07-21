import type { ReactNode } from "react";
import { DesktopShell } from "./DesktopShell";
import { Logo } from "./Logo";

export function AuthPageLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <DesktopShell minimal>
      <div className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-md flex-col justify-center py-8 sm:py-12">
        <div className="mb-8 text-center">
          <Logo className="justify-center" inverted />
          <h1 className="section-heading mt-6">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-secondary">{subtitle}</p>}
        </div>
        <div className="panel-card p-6 sm:p-8">{children}</div>
      </div>
    </DesktopShell>
  );
}
