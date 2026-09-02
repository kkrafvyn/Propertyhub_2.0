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
    caption: "Premium estates",
  },
  {
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=85",
    caption: "Modern architectural estates",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=2400&q=85",
    caption: "Contemporary villas",
  },
  {
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=2400&q=85",
    caption: "Residential developments",
  },
  {
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2400&q=85",
    caption: "Luxury hilltop residences",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=2400&q=85",
    caption: "Coastal properties",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2400&q=85",
    caption: "Interior living spaces",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=2400&q=85",
    caption: "Curated modern homes",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=2400&q=85",
    caption: "Private estate portfolios",
  },
] as const;

const INTERVAL_MS = 7000;

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
