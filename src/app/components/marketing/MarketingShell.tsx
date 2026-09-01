import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "../baytmiftah/Logo";
import { ThemeToggle } from "../baytmiftah/ThemeToggle";
import { appPath } from "../../../lib/marketing-urls";
import { MarketingBackgroundCarousel } from "./MarketingBackgroundCarousel";
import "./marketing.css";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#workflow" },
  { label: "AI", href: "#ai" },
  { label: "For Businesses", href: "#business" },
  { label: "For Consumers", href: "#consumers" },
  { label: "Resources", href: "#explorer" },
] as const;

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  return (
    <a href={href} className="mk-nav-link" onClick={onClick}>
      {label}
    </a>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="marketing-page marketing-shell">
      <MarketingBackgroundCarousel />
      <div className="mk-page-scrim" aria-hidden="true" />
      <header className={`mk-nav${scrolled ? " mk-nav--scrolled" : ""}`}>
        <div className="mk-nav-inner">
          <Logo to="/" size="sm" />
          <nav className="mk-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
          <div className="mk-nav-actions">
            <ThemeToggle />
            <a href={appPath("/login")} className="mk-btn mk-btn-secondary hidden sm:inline-flex">
              Log in
            </a>
            <a href={appPath("/signup")} className="mk-btn mk-btn-primary">
              Get Started
            </a>
            <button
              type="button"
              className="mk-menu-toggle lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="mk-mobile-drawer lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" aria-label="Close menu" onClick={closeMenu} />
          <div className="mk-mobile-panel">
            <div className="flex items-center justify-between mb-4">
              <Logo to="/" size="sm" />
              <button type="button" className="mk-menu-toggle" aria-label="Close menu" onClick={closeMenu}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} {...link} onClick={closeMenu} />
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <a href={appPath("/login")} className="mk-btn mk-btn-secondary" onClick={closeMenu}>
                Log in
              </a>
              <a href={appPath("/signup")} className="mk-btn mk-btn-primary" onClick={closeMenu}>
                Get Started
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mk-main">{children}</main>

      <MarketingFooter />
    </div>
  );
}

function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-grid">
        <div className="mk-footer-brand">
          <Logo to="/" size="sm" />
          <p>The Operating System for Real Estate.</p>
        </div>

        <div className="mk-footer-col">
          <h4>Product</h4>
          <ul>
            <li>
              <a href="#product">Platform</a>
            </li>
            <li>
              <a href="#workflow">Workflow</a>
            </li>
            <li>
              <a href="#ai">AI</a>
            </li>
            <li>
              <a href="#business">Businesses</a>
            </li>
            <li>
              <a href="#consumers">Consumers</a>
            </li>
            <li>
              <Link to="/explorer">Explorer</Link>
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
        </div>

        <div className="mk-footer-col">
          <h4>Resources</h4>
          <ul>
            <li>
              <Link to="/help">Help Center</Link>
            </li>
            <li>
              <span>Documentation — docs.baytmiftah.com (coming soon)</span>
            </li>
            <li>
              <span>Status — status.baytmiftah.com (coming soon)</span>
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
              <Link to="/legal/acceptable-use">Acceptable Use</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mk-footer-bottom">© {new Date().getFullYear()} BaytMiftah. All rights reserved.</p>
    </footer>
  );
}
