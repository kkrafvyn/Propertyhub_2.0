import { Link } from "react-router";

const BRAND_GREEN = "#0F2922";

function HouseMarkPaths({
  stroke,
  fill,
}: {
  stroke: string;
  fill: string;
}) {
  return (
    <>
      <path
        d="M24 13.5L34.5 22V35.5H13.5V22L24 13.5Z"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x="21" y="28.5" width="6" height="7" rx="1" fill={fill} />
    </>
  );
}

export function LogoMark({
  className = "h-9 w-9",
  inverted = false,
  ...props
}: React.SVGProps<SVGSVGElement> & { inverted?: boolean }) {
  const background = inverted ? "#FFFFFF" : BRAND_GREEN;
  const stroke = inverted ? BRAND_GREEN : "#FFFFFF";
  const fill = inverted ? BRAND_GREEN : "#FFFFFF";

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="48" height="48" rx="12" fill={background} />
      <HouseMarkPaths stroke={stroke} fill={fill} />
    </svg>
  );
}

interface LogoProps {
  to?: string;
  className?: string;
  showText?: boolean;
  size?: "sm" | "md";
  inverted?: boolean;
}

export function Logo({
  to = "/",
  className = "",
  showText = true,
  size = "md",
  inverted = false,
}: LogoProps) {
  const textSize = size === "sm" ? "text-sm" : "text-lg";
  const markSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <Link to={to} className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <LogoMark className={markSize} inverted={inverted} />
      {showText && (
        <span
          className={`${textSize} font-bold tracking-[0.14em] ${inverted ? "text-white" : "text-brand-forest"}`}
        >
          BΛYTMIFTΛH
        </span>
      )}
    </Link>
  );
}
