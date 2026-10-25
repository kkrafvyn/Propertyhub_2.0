import "../../../styles/consumer-account.css";
import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "./Logo";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface CarouselSlide {
  image: string;
  title: string;
  subtitle: string;
  location: string;
}

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    image:
      `${import.meta.env.BASE_URL}marketing/hero/architecture-1280.webp`,
    title: "The Architecture of Trust",
    subtitle: "End-to-end lease governance, autonomous SLA dispatch, and verifiable ownership ledgers.",
    location: "Airport Hills • Executive Enclaves",
  },
  {
    image:
      `${import.meta.env.BASE_URL}marketing/hero/residences-1280.webp`,
    title: "Deterministic Financial Rigor",
    subtitle: "Automated rental waterfall distributions, statutory GRA withholding, and immutable double-entry sub-ledgers.",
    location: "Cantonments • Signature Residences",
  },
  {
    image:
      `${import.meta.env.BASE_URL}marketing/hero/interior-1280.webp`,
    title: "Living Enterprise Ecosystems",
    subtitle: "Specialized AI workforce operating 24/7 across leasing, collections, and predictive maintenance triage.",
    location: "East Legon • Prime Sanctuaries",
  },
  {
    image:
      `${import.meta.env.BASE_URL}marketing/hero/community-1280.webp`,
    title: "Curated Luxury & Discovery",
    subtitle: "Privacy-preserving public exploration paired with certified biometric digital agreements.",
    location: "Ridge & Roman Ridge • High-Value Portfolios",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  heroTitle?: string;
  heroSubtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const slide = CAROUSEL_SLIDES[currentSlide];

  return (
    <div className="auth-shell min-h-[100dvh] flex bg-neutral-950 lg:bg-background text-foreground font-sans antialiased relative overflow-hidden">
      {/* Mobile Full-Bleed Animated Carousel Background */}
      <div className="auth-mobile-background lg:hidden absolute inset-0 z-0 select-none overflow-hidden">
        {CAROUSEL_SLIDES.map((s, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            } transform transition-transform duration-10000 ease-out`}
          >
            <img
              src={s.image}
              alt=""
              className="w-full h-full object-cover brightness-[0.55] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/50 to-neutral-950/90" />
          </div>
        ))}
      </div>

      {/* Left Form Surface */}
      <div className="auth-content flex-1 flex flex-col justify-between px-4 sm:px-10 lg:px-16 xl:px-20 py-8 lg:py-12 overflow-y-auto max-w-2xl mx-auto lg:mx-0 w-full relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between w-full">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-white/80 lg:text-muted-foreground hover:text-white lg:hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Return to Home</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <main id="main-content" tabIndex={-1} className="my-auto py-6 sm:py-10 w-full max-w-md mx-auto">
          {/* Brand Identity */}
          <div className="mb-6 sm:mb-8">
            <div className="mb-6">
              <div className="lg:hidden"><Logo to="/" /></div>
              <div className="hidden lg:block"><Logo to="/" /></div>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-white lg:text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-white/70 lg:text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Form Content Card on Mobile */}
          <div className="auth-form-card bg-neutral-900/80 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border border-white/10 lg:border-none p-6 sm:p-8 lg:p-0 rounded-3xl shadow-2xl lg:shadow-none space-y-6">
            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-xs text-white/70 lg:text-muted-foreground">
              {footer}
            </div>
          )}
        </main>

        {/* Minimal Footer */}
        <div className="text-[11px] text-white/50 lg:text-muted-foreground/80 flex items-center justify-between">
          <span>© {new Date().getFullYear()} BaytMiftah Technologies</span>
        </div>
      </div>

      {/* Right Architectural Photography Carousel (Desktop) */}
      <div className="hidden lg:flex flex-1 relative bg-neutral-950 overflow-hidden select-none">
        {/* Background Images with Smooth Cross-Fade */}
        {CAROUSEL_SLIDES.map((s, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            } transform transition-transform duration-10000 ease-out`}
          >
            <img
              src={s.image}
              alt={s.title}
              className="w-full h-full object-cover brightness-[0.72] contrast-[1.05]"
            />
            {/* Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/50 via-transparent to-transparent" />
          </div>
        ))}

        {/* Carousel Content Container */}
        <div className="relative z-10 w-full h-full p-12 xl:p-16 flex flex-col justify-end text-white">
          {/* Bottom Editorial Caption */}
          <div className="space-y-4 max-w-xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/70">
              {slide.location}
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-3xl xl:text-4xl font-normal tracking-tight text-white leading-tight">
                {slide.title}
              </h2>
              <p className="text-sm text-white/80 leading-relaxed font-light max-w-lg">
                {slide.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
