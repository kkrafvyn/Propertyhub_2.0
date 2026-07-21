import type { ReactNode } from "react";
import { Navbar } from "../Navbar";

interface PageLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showNavbar?: boolean;
  maxWidthClassName?: string;
}

export function PageLayout({
  children,
  sidebar,
  showNavbar = true,
  maxWidthClassName = "max-w-7xl",
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showNavbar ? <Navbar /> : null}

      <div className={`${showNavbar ? "pt-24" : "pt-8"} pb-12 px-4 mx-auto ${maxWidthClassName}`}>
        {sidebar ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
            <main>{children}</main>
            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">{sidebar}</aside>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </div>
    </div>
  );
}
