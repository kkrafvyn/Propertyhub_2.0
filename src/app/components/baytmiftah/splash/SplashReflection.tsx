import { SplashLogoMark } from "./SplashLogoMark";
import { SPLASH_COLORS, SPLASH_WORDMARK } from "./constants";

export function SplashReflection({
  primary = SPLASH_COLORS.primary,
  shadow = SPLASH_COLORS.shadow,
}: {
  primary?: string;
  shadow?: string;
}) {
  return (
    <div className="splash-reflection" aria-hidden="true">
      <div className="splash-reflection__inner">
        <SplashLogoMark
          className="splash-reflection__mark"
          primary={primary}
          shadow={shadow}
        />
        <span className="splash-reflection__wordmark">{SPLASH_WORDMARK}</span>
      </div>
    </div>
  );
}
