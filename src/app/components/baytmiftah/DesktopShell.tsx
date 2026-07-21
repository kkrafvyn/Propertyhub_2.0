import { Link } from "react-router";
import type { ReactNode } from "react";
import { Heart, Moon, Scale, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "../NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";

interface DesktopShellProps {
  children: ReactNode;
  search?: ReactNode;
  categoryBar?: ReactNode;
  minimal?: boolean;
  fullBleed?: boolean;
  compareCount?: number;
}

function Header({
  search,
  minimal = false,
  categoryBar = null,
  compareCount = 0,
}: {
  search?: ReactNode;
  minimal?: boolean;
  categoryBar?: ReactNode;
  compareCount?: number;
}) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;

  return (
    <header className="desktop-header sticky top-0 z-50 border-b border-surface-border bg-surface">
      <div className="mx-auto w-full min-w-0 max-w-[var(--max-width-page)] px-4 sm:px-6 xl:px-20">
        <div
          className={`flex min-w-0 items-center gap-3 sm:gap-4 ${minimal ? "h-[72px]" : "h-[72px] xl:h-[76px]"}`}
        >
          <Logo inverted />

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            {!minimal && (
              <>
                <Link to="/search" className="nav-pill hidden items-center gap-2 lg:inline-flex">
                  <Scale className="h-4 w-4 opacity-70" />
                  Compare{compareCount > 0 ? ` (${compareCount})` : ""}
                </Link>
                <Link to="/app/saved" className="nav-pill hidden items-center gap-2 lg:inline-flex">
                  <Heart className="h-4 w-4 opacity-70" />
                  Saved
                </Link>
              </>
            )}
            <Link to={listPropertyPath} className="nav-pill nav-pill-cta hidden items-center gap-2 lg:inline-flex">
              List property
            </Link>
            {!minimal && user && <NotificationBell userId={user.id} />}
            <button
              type="button"
              onClick={toggleTheme}
              className="nav-pill hidden lg:inline-flex"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {!minimal && <LanguageSwitcher />}
            <UserMenu />
          </div>
        </div>

        {!minimal && search && (
          <div className="flex justify-center pb-5 pt-1">
            <div className="w-full max-w-[920px]">{search}</div>
          </div>
        )}

        {!minimal && categoryBar && (
          <div className="desktop-category-row border-t border-white/10 pb-4 pt-3">
            {categoryBar}
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;

  const columns = [
    {
      title: "Support",
      links: [
        { label: "Help centre", to: "/app" },
        { label: "Safety", to: "/app" },
        { label: "Cancellation", to: "/app" },
      ],
    },
    {
      title: "Hosting",
      links: [
        { label: "List your property", to: listPropertyPath },
        { label: "Host resources", to: "/workspace" },
        { label: "Referrals", to: "/app" },
      ],
    },
    {
      title: "Discover",
      links: [
        { label: "Search homes", to: "/search" },
        { label: "For rent", to: "/search?listingType=rental" },
        { label: "For sale", to: "/search?listingType=sale" },
        { label: "For lease", to: "/search?listingType=lease" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", to: "/app" },
        { label: "Careers", to: "/app" },
        { label: "Contact", to: "/app" },
      ],
    },
  ];

  return (
    <footer className="desktop-footer mt-12 border-t border-white/10">
      <div className="mx-auto max-w-[var(--max-width-page)] px-4 py-12 sm:px-6 xl:px-20">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map(({ title, links }) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>
              <ul className="space-y-3">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-ink-secondary hover:text-ink hover:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/app" className="text-sm text-ink-secondary hover:text-ink hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/app" className="text-sm text-ink-secondary hover:text-ink hover:underline">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-sm text-ink-secondary hover:text-ink hover:underline">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-ink-secondary">
          <p>© {year} BaytMiftah. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>English (GH)</span>
            <span>₵ GHS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function DesktopShell({
  children,
  search,
  categoryBar = null,
  minimal = false,
  fullBleed = false,
  compareCount = 0,
}: DesktopShellProps) {
  return (
    <div className="desktop-shell min-h-screen min-h-[100dvh] overflow-x-clip text-ink">
      <Header search={search} minimal={minimal} categoryBar={categoryBar} compareCount={compareCount} />
      <main
        className={
          fullBleed
            ? "w-full"
            : "mx-auto w-full min-w-0 max-w-[var(--max-width-page)] px-4 py-6 sm:px-6 xl:px-20 xl:py-8"
        }
      >
        {children}
      </main>
      {!minimal && <Footer />}
    </div>
  );
}
