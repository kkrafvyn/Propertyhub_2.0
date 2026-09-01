import { useEffect, useState } from "react";

const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=85",
    caption: "Executive residences",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85",
    caption: "Premium portfolios",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2400&q=85",
    caption: "Living spaces",
  },
  {
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=85",
    caption: "Commercial operations",
  },
  {
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2400&q=85",
    caption: "Leasing & transactions",
  },
] as const;

const INTERVAL_MS = 8000;

export function MarketingBackgroundCarousel() {
  const [active, setActive] = useState(0);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!motionOk) return undefined;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [motionOk]);

  return (
    <div className="mk-bg-carousel" aria-hidden="true">
      {SLIDES.map((slide, index) => (
        <div
          key={slide.image}
          className={`mk-bg-carousel-slide${index === active ? " is-active" : ""}`}
        >
          <img src={slide.image} alt="" loading={index <= 1 ? "eager" : "lazy"} decoding="async" />
        </div>
      ))}
      <div className="mk-bg-carousel-vignette" />
      <div className="mk-bg-carousel-grain" />
      <div className="mk-bg-carousel-dots">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.caption}
            type="button"
            className={`mk-bg-carousel-dot${index === active ? " is-active" : ""}`}
            aria-label={`Show slide ${index + 1}: ${slide.caption}`}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}
