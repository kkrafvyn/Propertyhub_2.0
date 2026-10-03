import { useEffect, useState } from "react";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars, type ExperienceScalars } from "./experience-scalars";

export function useExperienceScalars(throttleMs = 80) {
  const [scalars, setScalars] = useState<ExperienceScalars>(() =>
    experienceScalars(marketingScrollState.progress),
  );

  useEffect(() => {
    let last = 0;
    return marketingScrollState.subscribeChapters(() => {
      const now = performance.now();
      if (now - last < throttleMs) return;
      last = now;
      setScalars(experienceScalars(marketingScrollState.progress));
    });
  }, [throttleMs]);

  return scalars;
}
