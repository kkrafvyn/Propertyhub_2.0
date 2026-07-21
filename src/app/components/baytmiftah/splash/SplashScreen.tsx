import { useCallback, useEffect, useRef, useState } from "react";
import { hideNativeSplash } from "../../../lib/baytmiftah/capacitor-init";
import { isNativeApp } from "../../../lib/baytmiftah/platform";
import {
  NATIVE_SPLASH_COLORS,
  SPLASH_COLORS,
  SPLASH_DURATION_MS,
} from "./constants";
import { SplashLogoMark } from "./SplashLogoMark";
import { SplashReflection } from "./SplashReflection";
import { SplashTagline } from "./SplashTagline";
import { SplashWordmark } from "./SplashWordmark";
import "./splash.css";

const EXIT_MS = 420;
const SESSION_KEY = "baytmiftah.splash.seen";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function shouldSkipSplash(skipIfSeen: boolean, sessionKey: string) {
  if (!skipIfSeen) return false;
  try {
    return sessionStorage.getItem(sessionKey) === "1";
  } catch {
    return false;
  }
}

export function SplashScreen({
  onComplete,
  durationMs = SPLASH_DURATION_MS,
  fadeOut = true,
  skipIfSeen = true,
  sessionKey = SESSION_KEY,
  native = isNativeApp(),
}: {
  onComplete?: () => void;
  durationMs?: number;
  fadeOut?: boolean;
  skipIfSeen?: boolean;
  sessionKey?: string;
  native?: boolean;
}) {
  const colors = native ? NATIVE_SPLASH_COLORS : SPLASH_COLORS;
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);
  const skip = shouldSkipSplash(skipIfSeen, sessionKey);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (skipIfSeen) {
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        /* storage unavailable */
      }
    }
    setVisible(false);
    onComplete?.();
  }, [onComplete, sessionKey, skipIfSeen]);

  useEffect(() => {
    if (skip) {
      void hideNativeSplash();
      finish();
      return undefined;
    }

    void hideNativeSplash();

    const reduced = prefersReducedMotion();
    const holdMs = reduced ? 120 : durationMs;
    const exitMs = fadeOut && !reduced ? EXIT_MS : 0;

    const holdTimer = window.setTimeout(() => {
      if (fadeOut && !reduced) {
        setExiting(true);
        window.setTimeout(finish, exitMs);
      } else {
        finish();
      }
    }, holdMs);

    return () => window.clearTimeout(holdTimer);
  }, [durationMs, fadeOut, finish, skip]);

  if (skip || !visible) return null;

  return (
    <div
      className={`splash-screen${exiting ? " splash-screen--exit" : ""}${native ? " splash-screen--native" : ""}`}
      role="img"
      aria-label="BaytMiftah — unlocking property opportunities"
      style={{
        backgroundColor: colors.background,
        ["--splash-primary" as string]: colors.primary,
        ["--splash-bg" as string]: colors.background,
        ["--splash-tagline" as string]: colors.tagline,
        ["--splash-line" as string]: colors.line,
        ["--splash-reflection" as string]: colors.reflection,
      }}
    >
      <div
        className={`splash-screen__stage${!exiting ? " splash-screen__stage--polish" : ""}`}
      >
        <div className="splash-screen__mark-wrap">
          <SplashLogoMark primary={colors.primary} shadow={colors.shadow} />
        </div>

        <SplashWordmark />
        <SplashTagline />
        <SplashReflection primary={colors.primary} shadow={colors.shadow} />
      </div>
    </div>
  );
}
