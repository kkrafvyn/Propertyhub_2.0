import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import "./marketing-carousel.css";

export const HERO_SLIDES = [
  { id: "residences", label: "Modern residential buildings", overlay: 0.72 },
  { id: "interior", label: "Apartment interiors", overlay: 0.78 },
  { id: "community", label: "Residential communities", overlay: 0.76 },
  { id: "architecture", label: "Contemporary residences", overlay: 0.78 },
  { id: "commercial", label: "Commercial architecture", overlay: 0.72 },
] as const;

/** Only decoded photographs can replace the current slide. Failed assets are skipped. */
export function MarketingBackgroundCarousel({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [requested, setRequested] = useState<number | null>(null);
  const [ready, setReady] = useState<number[]>([]);
  const [failed, setFailed] = useState<number[]>([]);
  const [loadThrough, setLoadThrough] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => setReduced(media.matches);
    const visibilityChange = () => setHidden(document.hidden);
    media.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, []);

  useEffect(() => {
    if (requested !== null && ready.includes(requested)) {
      setActive(requested);
      setRequested(null);
    } else if (requested !== null && failed.includes(requested)) {
      setRequested(null);
    }
  }, [requested, ready, failed]);

  useEffect(() => {
    if (paused || focused || hidden || reduced || ready.length < 2) return;
    const timer = window.setTimeout(() => {
      for (let offset = 1; offset < HERO_SLIDES.length; offset++) {
        const next = (active + offset) % HERO_SLIDES.length;
        if (ready.includes(next)) { setActive(next); break; }
      }
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [active, paused, focused, hidden, reduced, ready]);

  const select = (index: number) => {
    if (failed.includes(index)) return;
    setLoadThrough((value) => Math.max(value, index));
    setRequested(index);
  };
  const advance = (direction: number) => {
    for (let offset = 1; offset < HERO_SLIDES.length; offset++) {
      const next = (active + direction * offset + HERO_SLIDES.length) % HERO_SLIDES.length;
      if (!failed.includes(next)) { select(next); break; }
    }
  };
  const settled = (index: number, ok: boolean) => {
    if (ok) setReady((value) => value.includes(index) ? value : [...value, index]);
    else {
      setFailed((value) => value.includes(index) ? value : [...value, index]);
      // If the first photo fails, the next successful photo becomes the fallback.
      if (index === active || !ready.includes(active)) {
        const fallback = ready.find((candidate) => candidate !== index && !failed.includes(candidate));
        setRequested((value) => value ?? fallback ?? ((index + 1) % HERO_SLIDES.length));
      }
    }
    setLoadThrough((value) => Math.min(HERO_SLIDES.length - 1, Math.max(value, index + 1)));
  };

  return (
    <section className="mk-photo-hero" aria-labelledby="marketing-hero-heading"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      <div className="mk-photo-hero__background" aria-hidden="true">
        {HERO_SLIDES.map((slide, index) => index <= loadThrough && !failed.includes(index) ? (
          <div key={slide.id} className={`mk-photo-hero__slide${index === active && (ready.includes(index) || index === 0) ? " is-active" : ""}`}>
            <picture>
              <source media="(max-width: 639px)" srcSet={`/marketing/hero/${slide.id}-mobile.webp`} />
              <img src={`/marketing/hero/${slide.id}-1280.webp`}
                srcSet={`/marketing/hero/${slide.id}-1280.webp 1280w, /marketing/hero/${slide.id}-2200.webp 2200w`}
                sizes="100vw" width="2200" height="1375" alt="" loading="eager"
                fetchPriority={index === 0 ? "high" : "low"} decoding="async"
                onLoad={async (event) => {
                  const img = event.currentTarget;
                  try { await img.decode(); settled(index, true); } catch { if (img.naturalWidth) settled(index, true); else settled(index, false); }
                }} onError={() => settled(index, false)} />
            </picture>
            <div className="mk-photo-hero__overlay" style={{ backgroundColor: `rgba(13, 25, 19, ${slide.overlay})` }} />
          </div>
        ) : null)}
      </div>
      <div className="mk-photo-hero__content">{children}</div>
      <div className="mk-ed-container mk-photo-hero__footer">
        <p>Illustrative properties. Stock photography.</p>
        <div className="mk-photo-controls" role="group" aria-label="Hero background controls">
          <button type="button" aria-label="Previous background image" onClick={() => advance(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          {HERO_SLIDES.map((slide, index) => (
            <button key={slide.id} type="button" className="mk-photo-controls__dot" aria-label={`Show background ${index + 1}: ${slide.label}`}
              aria-current={index === active ? "true" : undefined} disabled={failed.includes(index)} onClick={() => select(index)}><span /></button>
          ))}
          <button type="button" aria-label="Next background image" onClick={() => advance(1)}><ChevronRight size={18} aria-hidden="true" /></button>
          <button type="button" aria-label={reduced ? "Automatic rotation disabled by reduced motion preference" : paused ? "Play background slideshow" : "Pause background slideshow"}
            disabled={reduced} onClick={() => setPaused((value) => !value)}>{paused || reduced ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>
        </div>
      </div>
    </section>
  );
}
