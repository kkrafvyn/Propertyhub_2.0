import { Link } from "react-router";
import { useTheme } from "../../context/ThemeContext";
import { isBusinessMobileApp } from "../../../lib/mobile-app";
import { isDesktopWorkspaceApp } from "../../../lib/desktop-app";
import { BRAND_NAME } from "./splash/constants";

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
        <circle cx="19.6" cy="21.75" r="2.72" fill="#FFFFFF" />
        <path
          d="M4.5 30.56Q24 19.5 43.5 30.56Q24 23.72 4.5 30.56Z"
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
      <circle cx="19.6" cy="21.75" r="2.72" fill={fill} />
      <path
        d="M4.5 30.56Q24 19.5 43.5 30.56Q24 23.72 4.5 30.56Z"
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
  const logoVariant = resolveLogoVariant(variant);
  const useDesktopAsset = isDesktopWorkspaceApp();
  const markSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  const content = (
    <>
      {showText ? (
        <img
          src={`${import.meta.env.BASE_URL}brand/logo-approved.png`}
          alt=""
          className={`${size === "sm" ? "h-12 w-36" : "h-16 w-48"} shrink-0 rounded bg-white object-contain`}
          aria-hidden="true"
        />
      ) : useDesktopAsset ? (
        <img
          src={DESKTOP_LOGO_SRC}
          alt=""
          className={`${markSize} shrink-0 rounded-[10px] object-cover`}
          aria-hidden="true"
        />
      ) : (
        <LogoMark className={markSize} inverted={inverted} variant={logoVariant} />
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
