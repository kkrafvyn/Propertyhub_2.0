import { useEffect, useState } from "react";
import { marketingScrollState } from "./marketingScrollState";

/** DOM chapter copy — updates at most once per animation frame. */
export function useChapterScrollProgress() {
  const [progress, setProgress] = useState(() => marketingScrollState.progress);

  useEffect(() => {
    return marketingScrollState.subscribeChapters(() => {
      setProgress(marketingScrollState.progress);
    });
  }, []);

  return progress;
}
