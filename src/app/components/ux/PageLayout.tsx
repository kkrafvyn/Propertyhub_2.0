import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { DesktopShell } from "../baytmiftah/DesktopShell";
import { isBusinessMobileApp } from "../../../lib/mobile-app";

interface PageLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showNavbar?: boolean;
  maxWidthClassName?: string;
  variant?: "default" | "consumer";
}

export function PageLayout({
  children,
  sidebar,
  showNavbar = true,
  maxWidthClassName = "max-w-7xl",
  variant = "default",
}: PageLayoutProps) {
  const hideNavbarOnNativeConsumer =
    Capacitor.isNativePlatform() && !isBusinessMobileApp();
  const shouldShowShell = showNavbar && !hideNavbarOnNativeConsumer;

  const content = sidebar ? (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
      <main>{children}</main>
      <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">{sidebar}</aside>
    </div>
  ) : (
    <main>{children}</main>
  );

  if (variant === "consumer") {
    if (!shouldShowShell) {
      return (
        <div className="consumer-portal min-h-screen">
          <div className={`pb-12 px-4 mx-auto ${maxWidthClassName}`}>{content}</div>
        </div>
      );
    }

    return (
      <DesktopShell minimal showFooter={false}>
        <div className={`mx-auto w-full ${maxWidthClassName}`}>{content}</div>
      </DesktopShell>
    );
  }

  if (!shouldShowShell) {
    return (
      <div className="min-h-screen bg-background">
        <div className={`pb-12 px-4 mx-auto ${maxWidthClassName}`}>{content}</div>
      </div>
    );
  }

  return (
    <DesktopShell minimal showFooter={false}>
      <div className={`mx-auto w-full ${maxWidthClassName}`}>{content}</div>
    </DesktopShell>
  );
}
