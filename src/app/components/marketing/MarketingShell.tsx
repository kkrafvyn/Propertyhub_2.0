import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "../baytmiftah/Logo";
import { appPath } from "../../../lib/marketing-urls";
import "./marketing.css";

const NAV_LINKS_DEFAULT = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#workflow" },
  { label: "AI", href: "#ai" },
  { label: "For Businesses", href: "#business" },
  { label: "For Consumers", href: "#consumers" },
  { label: "Resources", href: "#explorer" },
] as const;

export type MarketingNavLink = { label: string; href: string };

function NavLink({
  href,
  label,
  onClick,
  active = false,
}: {
  href: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`mk-nav-link${active ? " mk-nav-link--active" : ""}`}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
    >
      {label}
    </a>
  );
}

export function MarketingShell({
  children,
  cinematic = false,
  editorial = false,
  launch = false,
  navLinks,
}: {
  children: ReactNode;
  cinematic?: boolean;
  editorial?: boolean;
  launch?: boolean;
  navLinks?: readonly MarketingNavLink[];
}) {
  const darkChrome = cinematic || editorial || launch;
  const links = navLinks ?? NAV_LINKS_DEFAULT;
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setPastHero(window.scrollY > window.innerHeight * 0.35);
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!editorial) return undefined;

    const sectionIds = links
      .map((link) => link.href.replace(/^#/, ""))
      .filter((id) => id.length > 0);

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top instanceof HTMLElement && top.id) {
          setActiveSection(`#${top.id}`);
        }
      },
      { rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.15, 0.35] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [editorial, links]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTarget = drawerRef.current?.querySelector<HTMLElement>(
      "a, button, [tabindex]:not([tabindex='-1'])",
    );
    focusTarget?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  return (
    <div
      className={`marketing-page marketing-shell${cinematic ? " marketing-page--cinematic" : ""}${editorial ? " marketing-page--editorial" : ""}${editorial && pastHero ? " mk-shell--past-hero" : ""}${launch ? " marketing-page--launch" : ""}`}
    >
      <div className="mk-page-scrim" aria-hidden="true" />
      <div
        className="mk-scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />
      <a href="#mk-main-content" className="mk-skip-link">
        Skip to content
      </a>
      <header
        className={`mk-nav${scrolled ? " mk-nav--scrolled" : ""}${darkChrome ? " mk-nav--dark-chrome" : ""}${launch ? " mk-nav--launch" : ""}`}
      >
        <div className="mk-nav-inner">
          <Logo to="/" size="sm" inverted={darkChrome} />
          <nav className="mk-nav-links" aria-label="Primary">
            {links.map((link) => (
              <NavLink key={link.href} {...link} active={editorial && activeSection === link.href} />
            ))}
          </nav>
          <div className="mk-nav-actions">
            <a
              href={appPath("/login")}
              className={`mk-btn mk-btn-secondary mk-nav-login${darkChrome ? " mk-nav-login--desktop" : " hidden sm:inline-flex"}`}
            >
              {launch ? "Sign in" : "Log in"}
            </a>
            {darkChrome ? (
              <Link to="/contact" className="mk-btn mk-btn-secondary mk-nav-demo">
                Book a demo
              </Link>
            ) : null}
            <a
              href={appPath("/signup")}
              className={`mk-btn mk-btn-primary${darkChrome ? " mk-nav-cta-compact" : ""}`}
            >
              {darkChrome ? "Start free" : "Get Started"}
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              className="mk-menu-toggle lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mk-mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          className={`mk-mobile-drawer lg:hidden${darkChrome ? " mk-mobile-drawer--cinematic" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mk-mobile-navigation-title"
          id="mk-mobile-navigation"
          ref={drawerRef}
        >
          <button type="button" className="mk-mobile-drawer__backdrop" aria-label="Close menu" onClick={closeMenu} />
          <div className="mk-mobile-panel">
            <div className="mk-mobile-panel__head">
              <p id="mk-mobile-navigation-title" className="mk-mobile-panel__title">
                Menu
              </p>
              <Logo to="/" size="sm" inverted={darkChrome} />
              <button type="button" className="mk-menu-toggle" aria-label="Close menu" onClick={closeMenu}>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="mk-mobile-panel__links" aria-label="Mobile">
              {links.map((link) => (
                <NavLink
                  key={link.href}
                  {...link}
                  onClick={closeMenu}
                  active={editorial && activeSection === link.href}
                />
              ))}
            </nav>
            <div className="mk-mobile-panel__actions">
              <a href={appPath("/login")} className="mk-btn mk-btn-secondary" onClick={closeMenu}>
                Log in
              </a>
              <Link to="/contact" className="mk-btn mk-btn-secondary" onClick={closeMenu}>
                Book a demo
              </Link>
              <a href={appPath("/signup")} className="mk-btn mk-btn-primary" onClick={closeMenu}>
                Start free
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mk-main">{children}</main>

      <MarketingFooter darkChrome={darkChrome} />
    </div>
  );
}

function MarketingFooter({ darkChrome }: { darkChrome: boolean }) {
  return (
    <footer className={`mk-footer${darkChrome ? " mk-footer--editorial" : ""}`}>
      <div className="mk-container mk-footer-grid">
        <div className="mk-footer-brand">
          <Logo to="/" size="sm" inverted={darkChrome} />
          <p>One connected app for modern property operations.</p>
        </div>

        <div className="mk-footer-col">
          <h4>Product</h4>
          <ul>
            <li>
              <a href="/#product-tour">Product tour</a>
            </li>
            <li>
              <a href="/#workflow">Workflow</a>
            </li>
            <li>
              <a href="/#features">Features</a>
            </li>
            <li>
              <a href="/#trust">Trust</a>
            </li>
            <li>
              <a href="/#pricing">Plans</a>
            </li>
          </ul>
        </div>

        <div className="mk-footer-col">
          <h4>Resources</h4>
          <ul>
            <li>
              <Link to="/help">Help Centre</Link>
            </li>
            <li>
              <Link to="/status">System status</Link>
            </li>
            <li>
              <Link to="/legal">Legal centre</Link>
            </li>
            <li>
              <Link to="/sitemap">Sitemap</Link>
            </li>
          </ul>
        </div>

        <div className="mk-footer-col">
          <h4>Company</h4>
          <ul>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li>
              <Link to="/careers">Careers</Link>
            </li>
          </ul>
          <h4 className="mt-6">Legal</h4>
          <ul>
            <li>
              <Link to="/terms">Terms</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy</Link>
            </li>
            <li>
              <Link to="/legal/cookies">Cookies</Link>
            </li>
            <li>
              <Link to="/legal/trust-verification">Trust & Verification</Link>
            </li>
            <li>
              <Link to="/complaint">Complaints</Link>
            </li>
            <li>
              <Link to="/legal">All Policies</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mk-footer-bottom">© {new Date().getFullYear()} BaytMiftah. All rights reserved.</p>
    </footer>
  );
}
