import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function useIdleSessionTimeout(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;

    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await supabase.auth.signOut({ scope: "global" });
      }, IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    for (const event of events) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    resetTimer();

    return () => {
      if (timer) window.clearTimeout(timer);
      for (const event of events) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [enabled]);
}
