import { useEffect, useState } from "react";
import { PHONE_MEDIA, TABLET_MEDIA, BELOW_DESKTOP_MEDIA, DESKTOP_MEDIA } from "../lib/viewports";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobileViewport() {
  return useMediaQuery(BELOW_DESKTOP_MEDIA);
}

export function useIsTabletViewport() {
  return useMediaQuery(TABLET_MEDIA);
}

export function useIsPhoneViewport() {
  return useMediaQuery(PHONE_MEDIA);
}

export function useIsDesktopViewport() {
  return useMediaQuery(DESKTOP_MEDIA);
}
