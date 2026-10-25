import { Link } from "react-router";
import { useTheme } from "../../context/ThemeContext";
import { isBusinessMobileApp } from "../../../lib/mobile-app";
import { isDesktopWorkspaceApp } from "../../../lib/desktop-app";
import { BRAND_NAME, SPLASH_WORDMARK } from "./splash/constants";

const BRAND_GREEN = "#0F2922";
const WORKSPACE_NAVY = "#0B2545";
const DESKTOP_LOGO_SRC = `${import.meta.env.BASE_URL}brand/app-icon-workspace.svg`;

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
          d="M4.5 33.5Q24 22.4 43.5 33.5Q24 26.9 4.5 33.5Z"
          fill="#FFFFFF"
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
        d="M4.5 33.5Q24 22.4 43.5 33.5Q24 26.9 4.5 33.5Z"
        fill={fill}
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
  disableLink?: boolean;
}

export function Logo({
  to = "/",
  className = "",
  showText = true,
  size = "md",
  inverted = false,
  variant,
  disableLink = false,
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const logoVariant = resolveLogoVariant(variant);
  const useDesktopAsset = isDesktopWorkspaceApp();
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

  const content = (
    <>
      {useDesktopAsset ? (
        <img
          src={DESKTOP_LOGO_SRC}
          alt=""
          className={`${markSize} shrink-0 rounded-[10px] object-cover`}
          aria-hidden="true"
        />
      ) : (
        <LogoMark className={markSize} inverted={inverted} variant={logoVariant} />
      )}
      {showText && (
        <span
          className={`${textSize} font-bold tracking-[0.08em] ${textColor}`}
          aria-hidden="true"
        >
          {SPLASH_WORDMARK}
        </span>
      )}
    </>
  );

  if (disableLink) {
    return (
      <div className={`flex shrink-0 items-center gap-2.5 ${className}`} aria-label={BRAND_NAME}>
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      aria-label={BRAND_NAME}
      className={`flex shrink-0 items-center gap-2.5 ${className}`}
    >
      {content}
    </Link>
  );
}
