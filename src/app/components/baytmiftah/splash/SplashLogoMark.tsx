import { SPLASH_COLORS } from "./constants";

const HOUSE_PATH = "M24 13.5L34.5 22V35.5H13.5V22L24 13.5Z";

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
        <filter id="splashMarkShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <ellipse
        className="splash-mark__arc-shadow"
        cx="24"
        cy="40"
        rx="14"
        ry="2.5"
        fill={shadow}
        style={{ transformOrigin: "24px 40px" }}
      />

      <rect className="splash-mark__bg" width="48" height="48" rx="12" fill={primary} />

      <path
        className="splash-mark__arc"
        d={HOUSE_PATH}
        pathLength="1"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      <rect
        className="splash-mark__dot"
        x="21"
        y="28.5"
        width="6"
        height="7"
        rx="1"
        fill="#FFFFFF"
      />
    </svg>
  );
}
