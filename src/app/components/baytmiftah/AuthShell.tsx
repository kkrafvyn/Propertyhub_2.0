import type { ReactNode } from "react";
import { Link } from "react-router";

function HomeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function AuthShell({
  title,
  subtitle,
  heroTitle,
  heroSubtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  heroTitle: string;
  heroSubtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-shell flex min-h-screen min-h-[100dvh] bg-background text-foreground">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="mb-6 inline-flex items-center gap-2" aria-label="BaytMiftah home">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-forest">
                <HomeIcon />
              </div>
            </Link>
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </div>

      <div className="auth-shell-hero relative hidden flex-1 lg:block">
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-12">
          <div className="text-white">
            <h2 className="mb-4 text-4xl font-semibold">{heroTitle}</h2>
            <p className="text-xl text-white/90">{heroSubtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
