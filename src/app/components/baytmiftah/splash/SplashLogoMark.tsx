import { SPLASH_COLORS } from "./constants";

const ARC_PATH = "M4.5 30.56Q24 19.5 43.5 30.56Q24 23.72 4.5 30.56Z";

export function SplashLogoMark({
  className = "splash-mark",
  primary = SPLASH_COLORS.primary,
  shadow = SPLASH_COLORS.shadow,
}: {
  className?: string;
  primary?: string;
  shadow?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="splashDotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={primary} stopOpacity="0.45" />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
        <filter id="splashArcBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <circle
        className="splash-mark__glow"
        cx="19.6"
        cy="21.75"
        r="14"
        fill="url(#splashDotGlow)"
      />

      <ellipse
        className="splash-mark__arc-shadow"
        cx="24"
        cy="34"
        rx="16"
        ry="2.5"
        fill={shadow}
        style={{ transformOrigin: "24px 34px" }}
      />

      <circle className="splash-mark__dot" cx="19.6" cy="21.75" r="2.72" fill={primary} />

      <path
        className="splash-mark__arc"
        d={ARC_PATH}
        pathLength="1"
        fill={primary}
      />
    </svg>
  );
}
