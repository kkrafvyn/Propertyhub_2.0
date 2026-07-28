import { Link, useLocation } from "react-router";
import type { ReactNode } from "react";
import { Heart, Moon, Plus, Scale, Sun } from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "../NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../i18n/LocaleContext";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";

const DESKTOP_EXPLORE_LINKS = [
  { to: CONSUMER_ROUTES.home, labelKey: "mobile.home", end: true },
  { to: "/search?listingType=rental", labelKey: "mobile.homeScreen.rent" },
  { to: "/search?listingType=sale", labelKey: "mobile.homeScreen.buy" },
  { to: "/search?listingType=lease", labelKey: "mobile.homeScreen.lease" },
  { to: "/search?listingType=short_stay", labelKey: "mobile.homeScreen.stay" },
] as const;

function DesktopSubNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="desktop-subnav hidden border-t border-surface-border lg:block" aria-label="Explore">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DESKTOP_EXPLORE_LINKS.map((link) => {
          const { to, labelKey } = link;
          const isHome = "end" in link && link.end;
          const active = isHome
            ? location.pathname === "/"
            : location.pathname.startsWith("/search") && location.search.includes(to.split("?")[1] || "");

          return (
            <Link
              key={to}
              to={to}
              className={`desktop-subnav-link${active ? " desktop-subnav-link--active" : ""}`}
            >
              {t(labelKey)}
            </Link>
          );
        })}
        <Link
          to={CONSUMER_ROUTES.compare}
          className={`desktop-subnav-link${location.pathname.startsWith("/compare") ? " desktop-subnav-link--active" : ""}`}
        >
          {t("nav.compare")}
        </Link>
      </div>
    </nav>
  );
}

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
  const { t } = useTranslation();
  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;

  return (
    <header className="desktop-header sticky top-0 z-50 border-b border-surface-border bg-white/92 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto w-full min-w-0 max-w-[var(--max-width-page)] px-4 sm:px-6 md:px-8 xl:px-20">
        <div
          className={`flex min-w-0 items-center gap-2 sm:gap-3 md:gap-4 ${minimal ? "h-[68px] md:h-[72px]" : "h-[68px] md:h-[72px] xl:h-[76px]"}`}
        >
          <Logo size="sm" className="md:hidden" />
          <Logo className="hidden md:flex" />

          <div className="ml-auto flex shrink-0 items-center gap-0.5 md:gap-1">
            {!minimal && (
              <>
                <Link
                  to="/compare"
                  className="nav-pill nav-pill-icon hidden lg:inline-flex"
                  title={`${t("nav.compare")}${compareCount > 0 ? ` (${compareCount})` : ""}`}
                >
                  <Scale className="h-4 w-4 opacity-80" />
                  <span>
                    {t("nav.compare")}
                    {compareCount > 0 ? ` (${compareCount})` : ""}
                  </span>
                  {compareCount > 0 ? (
                    <span className="nav-pill-badge xl:hidden">{compareCount}</span>
                  ) : null}
                </Link>
                <Link to="/app/saved" className="nav-pill nav-pill-icon hidden lg:inline-flex" title={t("nav.saved")}>
                  <Heart className="h-4 w-4 opacity-80" />
                  <span>{t("nav.saved")}</span>
                </Link>
              </>
            )}
            <Link
              to={listPropertyPath}
              className="nav-pill nav-pill-cta hidden md:inline-flex"
              title={t("nav.listProperty")}
            >
              <Plus className="h-4 w-4 md:mr-0 xl:mr-1" />
              <span className="hidden xl:inline">{t("nav.listProperty")}</span>
            </Link>
            {!minimal && user ? (
              <div className="hidden md:block">
                <NotificationBell userId={user.id} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="nav-pill nav-pill-icon hidden md:inline-flex"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {!minimal ? (
              <div className="hidden lg:block">
                <LanguageSwitcher />
              </div>
            ) : null}
            <UserMenu />
          </div>
        </div>

        {!minimal ? <DesktopSubNav /> : null}

        {!minimal && search ? (
          <div className="flex justify-center pb-4 pt-2 md:pb-5 md:pt-1">
            <div className="w-full max-w-[920px]">{search}</div>
          </div>
        ) : null}

        {!minimal && categoryBar ? (
          <div className="desktop-category-row border-t border-surface-border pb-3 pt-2 md:pb-4 md:pt-3">
            {categoryBar}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const { t } = useTranslation();
  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;

  const columns = [
    {
      title: t("footer.support"),
      links: [
        { label: t("footer.helpCentre"), to: "/app" },
        { label: t("footer.safety"), to: "/app" },
        { label: t("footer.cancellation"), to: "/app" },
      ],
    },
    {
      title: t("footer.hosting"),
      links: [
        { label: t("footer.listProperty"), to: listPropertyPath },
        { label: t("footer.hostResources"), to: "/workspace" },
        { label: t("footer.referrals"), to: "/app" },
      ],
    },
    {
      title: t("footer.discover"),
      links: [
        { label: t("footer.searchHomes"), to: "/search" },
        { label: t("footer.forRent"), to: "/search?listingType=rental" },
        { label: t("footer.forSale"), to: "/search?listingType=sale" },
        { label: t("footer.forLease"), to: "/search?listingType=lease" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("footer.about"), to: "/app" },
        { label: t("footer.careers"), to: "/app" },
        { label: t("footer.contact"), to: "/app" },
      ],
    },
  ];

  return (
    <footer className="desktop-footer mt-12 border-t border-surface-border bg-white md:mt-16">
      <div className="mx-auto max-w-[var(--max-width-page)] px-4 py-10 sm:px-6 md:px-8 md:py-14 xl:px-20">
        <div className="mb-8 flex flex-col gap-4 border-b border-surface-border pb-8 md:mb-10 md:pb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-base font-semibold text-ink">BaytMiftah</p>
              <p className="text-sm text-ink-secondary">{t("footer.tagline")}</p>
            </div>
          </div>
          <Link to={listPropertyPath} className="desktop-footer-cta">
            {t("footer.listProperty")}
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {columns.map(({ title, links }) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>
              <ul className="space-y-3">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-sm text-ink-secondary transition hover:text-ink">
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
                <Link to="/privacy" className="text-sm text-ink-secondary transition hover:text-ink">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-ink-secondary transition hover:text-ink">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-sm text-ink-secondary transition hover:text-ink">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-surface-border pt-6 text-sm text-ink-secondary md:mt-10">
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
      <div className="desktop-shell-ambient" aria-hidden />
      <Header search={search} minimal={minimal} categoryBar={categoryBar} compareCount={compareCount} />
      <main
        className={
          fullBleed
            ? "relative z-[1] w-full"
            : "relative z-[1] mx-auto w-full min-w-0 max-w-[var(--max-width-page)] px-4 py-5 sm:px-6 md:px-8 md:py-6 xl:px-20 xl:py-8"
        }
      >
        {children}
      </main>
      {!minimal && <Footer />}
    </div>
  );
}
