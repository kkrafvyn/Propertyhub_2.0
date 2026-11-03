import { useEffect, useRef } from "react";

function markVisible(node: HTMLElement) {
  node.classList.add("mk-ed-reveal--visible");
}

function isInViewport(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom > 0 && rect.top < viewHeight;
}

export function useEditorialReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markVisible(node);
      return undefined;
    }

    if (isInViewport(node)) {
      markVisible(node);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markVisible(node);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "80px 0px 80px 0px" },
    );
    observer.observe(node);

    const fallback = window.setTimeout(() => {
      markVisible(node);
      observer.disconnect();
    }, 2500);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return ref;
}
