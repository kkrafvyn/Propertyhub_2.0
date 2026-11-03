import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./marketing-carousel.css";

export const HERO_SLIDES = [
  { id: "residences", label: "Modern residential buildings", overlay: 0.72 },
  { id: "interior", label: "Apartment interiors", overlay: 0.78 },
  { id: "community", label: "Residential communities", overlay: 0.76 },
  { id: "architecture", label: "Contemporary residences", overlay: 0.78 },
  { id: "commercial", label: "Commercial architecture", overlay: 0.72 },
  { id: "townhouse", label: "Modern home exteriors", overlay: 0.74 },
  { id: "skyline", label: "Urban residential towers", overlay: 0.7 },
  { id: "amenities", label: "Residence amenities", overlay: 0.72 },
] as const;

/** Only decoded photographs can replace the current slide. Failed assets are skipped. */
export function MarketingBackgroundCarousel({ children, imageIds }: { children: ReactNode; imageIds?: readonly string[] }) {
  const slides = useMemo(() => imageIds ? imageIds.map(id => HERO_SLIDES.find(slide => slide.id === id)!).filter(Boolean) : HERO_SLIDES, [imageIds]);
  const [active, setActive] = useState(0);
  const [requested, setRequested] = useState<number | null>(null);
  const [ready, setReady] = useState<number[]>([]);
  const [failed, setFailed] = useState<number[]>([]);
  const [loadThrough, setLoadThrough] = useState(0);
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
    if (focused || hidden || reduced || ready.length < 2) return;
    const timer = window.setTimeout(() => {
      for (let offset = 1; offset < slides.length; offset++) {
        const next = (active + offset) % slides.length;
        if (ready.includes(next)) {
          setActive(next);
          break;
        }
      }
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [active, focused, hidden, reduced, ready, slides.length]);

  const settled = (index: number, ok: boolean) => {
    if (ok) setReady((value) => value.includes(index) ? value : [...value, index]);
    else {
      setFailed((value) => value.includes(index) ? value : [...value, index]);
      if (index === active || !ready.includes(active)) {
        const fallback = ready.find((candidate) => candidate !== index && !failed.includes(candidate));
        setRequested((value) => value ?? fallback ?? ((index + 1) % slides.length));
      }
    }
    setLoadThrough((value) => Math.min(slides.length - 1, Math.max(value, index + 1)));
  };

  return (
    <section
      className="mk-photo-hero"
      aria-labelledby="marketing-hero-heading"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="mk-photo-hero__background" aria-hidden="true">
        {slides.map((slide, index) => index <= loadThrough && !failed.includes(index) ? (
          <div key={slide.id} className={`mk-photo-hero__slide${index === active && (ready.includes(index) || index === 0) ? " is-active" : ""}`}>
            <picture>
              <source media="(max-width: 639px)" srcSet={`/marketing/hero/${slide.id}-mobile.webp`} />
              <img
                src={`/marketing/hero/${slide.id}-1280.webp`}
                srcSet={`/marketing/hero/${slide.id}-1280.webp 1280w, /marketing/hero/${slide.id}-2200.webp 2200w`}
                sizes="100vw"
                width="2200"
                height="1375"
                alt=""
                loading="eager"
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
                onLoad={async (event) => {
                  const img = event.currentTarget;
                  try {
                    await img.decode();
                    settled(index, true);
                  } catch {
                    if (img.naturalWidth) settled(index, true);
                    else settled(index, false);
                  }
                }}
                onError={() => settled(index, false)}
              />
            </picture>
            <div className="mk-photo-hero__overlay" style={{ backgroundColor: `rgba(13, 25, 19, ${slide.overlay})` }} />
          </div>
        ) : null)}
      </div>
      <div className="mk-photo-hero__content">{children}</div>
    </section>
  );
}
