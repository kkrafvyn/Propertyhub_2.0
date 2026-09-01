import { Link } from "react-router";
import { useTheme } from "../../context/ThemeContext";
import { isBusinessMobileApp } from "../../../lib/mobile-app";
import { BRAND_NAME, SPLASH_WORDMARK } from "./splash/constants";

const BRAND_GREEN = "#0F2922";
const WORKSPACE_NAVY = "#0B2545";

export type LogoVariant = "default" | "workspace";

function resolveLogoVariant(variant?: LogoVariant): LogoVariant {
  if (variant) return variant;
  return isBusinessMobileApp() ? "workspace" : "default";
}

export function LogoMark({
  className = "h-9 w-9",
  inverted = false,
  variant,
  ...props
}: React.SVGProps<SVGSVGElement> & { inverted?: boolean; variant?: LogoVariant }) {
  const { resolvedTheme } = useTheme();
  const logoVariant = resolveLogoVariant(variant);

  if (logoVariant === "workspace") {
    return (
      <svg
        className={className}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...props}
      >
        <rect width="48" height="48" rx="10.5" fill={WORKSPACE_NAVY} />
        <circle cx="24" cy="15" r="5.5" fill="#FFFFFF" />
        <path
          d="M9 33.5Q24 24.5 39 33.5"
          stroke="#FFFFFF"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const fill = inverted || resolvedTheme === "dark" ? "#FFFFFF" : BRAND_GREEN;

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="24" cy="15" r="5.5" fill={fill} />
      <path
        d="M9 33.5Q24 24.5 39 33.5"
        stroke={fill}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LogoProps {
  to?: string;
  className?: string;
  showText?: boolean;
  size?: "sm" | "md";
  inverted?: boolean;
  variant?: LogoVariant;
}

export function Logo({
  to = "/",
  className = "",
  showText = true,
  size = "md",
  inverted = false,
  variant,
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const logoVariant = resolveLogoVariant(variant);
  const textSize = size === "sm" ? "text-sm" : "text-lg";
  const markSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const textColor =
    logoVariant === "workspace"
      ? inverted || resolvedTheme === "dark"
        ? "text-white"
        : "text-[#0B2545]"
      : inverted || resolvedTheme === "dark"
        ? "text-white"
        : "text-brand-forest";

  return (
    <Link
      to={to}
      aria-label={BRAND_NAME}
      className={`flex shrink-0 items-center gap-2.5 ${className}`}
    >
      <LogoMark className={markSize} inverted={inverted} variant={logoVariant} />
      {showText && (
        <span
          className={`${textSize} font-bold tracking-[0.08em] ${textColor}`}
          aria-hidden="true"
        >
          {SPLASH_WORDMARK}
        </span>
      )}
    </Link>
  );
}
