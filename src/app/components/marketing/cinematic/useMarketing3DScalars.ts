import { useEffect, useState } from "react";
import { marketingScrollState } from "./marketingScrollState";
import { sceneScalars } from "./SceneCameraRig";

/** Throttled React updates for Html-heavy 3D layers (~10fps). Camera/building use scroll store directly. */
export function useMarketing3DScalars(throttleMs = 100) {
  const [scalars, setScalars] = useState(() => sceneScalars(marketingScrollState.progress));

  useEffect(() => {
    let last = 0;
    return marketingScrollState.subscribeChapters(() => {
      const now = performance.now();
      if (now - last < throttleMs) return;
      last = now;
      setScalars(sceneScalars(marketingScrollState.progress));
    });
  }, [throttleMs]);

  return scalars;
}
