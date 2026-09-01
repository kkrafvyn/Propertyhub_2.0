import type { SVGProps } from "react";

/**
 * Clean, scalable inline SVG icons and visual mockup cards for BaytMiftah themes.
 */

export function ThemeSunIcon({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function ThemeMoonIcon({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path
        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M19 3v4" strokeWidth="1.5" />
      <path d="M21 5h-4" strokeWidth="1.5" />
    </svg>
  );
}

export function ThemeSystemIcon({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="20" height="14" x="2" y="3" rx="2" fill="currentColor" fillOpacity="0.08" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
      <path d="m3 14 18-9" strokeDasharray="2 2" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

export function ThemeLightCardPreview({ className = "w-full h-auto", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background container */}
      <rect width="240" height="140" rx="12" fill="#FCFBF9" stroke="#E5E7EB" strokeWidth="1.5" />
      
      {/* Header bar */}
      <rect x="12" y="12" width="216" height="24" rx="6" fill="#FFFFFF" stroke="#E5E7EB" />
      <circle cx="24" cy="24" r="5" fill="#0F2922" />
      <rect x="36" y="21" width="32" height="6" rx="3" fill="#0F2922" fillOpacity="0.8" />
      <rect x="176" y="19" width="44" height="10" rx="5" fill="#E07A5F" />

      {/* Main card */}
      <rect x="12" y="44" width="102" height="84" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
      <rect x="16" y="48" width="94" height="42" rx="6" fill="#F0F2F1" />
      {/* Card Image placeholder details */}
      <circle cx="88" cy="62" r="10" fill="#E07A5F" fillOpacity="0.2" />
      <path d="M22 84 L40 68 L60 82 L78 72 L104 88" stroke="#0F2922" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Listing card text */}
      <rect x="18" y="96" width="60" height="6" rx="3" fill="#1A1F1D" />
      <rect x="18" y="106" width="40" height="5" rx="2.5" fill="#5A6460" />
      <rect x="18" y="116" width="28" height="6" rx="3" fill="#0F2922" />

      {/* Secondary card */}
      <rect x="122" y="44" width="106" height="84" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
      <rect x="126" y="48" width="98" height="42" rx="6" fill="#F0F2F1" />
      <circle cx="198" cy="62" r="10" fill="#E9C349" fillOpacity="0.25" />
      <path d="M132 84 L152 70 L172 82 L192 74 L218 88" stroke="#0F2922" strokeWidth="1.5" strokeOpacity="0.3" />
      <rect x="128" y="96" width="64" height="6" rx="3" fill="#1A1F1D" />
      <rect x="128" y="106" width="46" height="5" rx="2.5" fill="#5A6460" />
      <rect x="128" y="116" width="30" height="6" rx="3" fill="#0F2922" />
    </svg>
  );
}

export function ThemeDarkCardPreview({ className = "w-full h-auto", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background container */}
      <rect width="240" height="140" rx="12" fill="#081713" stroke="#1F493D" strokeWidth="1.5" />
      
      {/* Header bar */}
      <rect x="12" y="12" width="216" height="24" rx="6" fill="#0F2820" stroke="#1F493D" />
      <circle cx="24" cy="24" r="5" fill="#52B788" />
      <rect x="36" y="21" width="32" height="6" rx="3" fill="#52B788" />
      <rect x="176" y="19" width="44" height="10" rx="5" fill="#E07A5F" />

      {/* Main card */}
      <rect x="12" y="44" width="102" height="84" rx="8" fill="#0F2820" stroke="#1F493D" />
      <rect x="16" y="48" width="94" height="42" rx="6" fill="#15372D" />
      {/* Glowing elements */}
      <circle cx="88" cy="62" r="10" fill="#52B788" fillOpacity="0.25" />
      <path d="M22 84 L40 68 L60 82 L78 72 L104 88" stroke="#52B788" strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Listing card text */}
      <rect x="18" y="96" width="60" height="6" rx="3" fill="#F3F4F6" />
      <rect x="18" y="106" width="40" height="5" rx="2.5" fill="#9DA9A4" />
      <rect x="18" y="116" width="28" height="6" rx="3" fill="#52B788" />

      {/* Secondary card */}
      <rect x="122" y="44" width="106" height="84" rx="8" fill="#0F2820" stroke="#1F493D" />
      <rect x="126" y="48" width="98" height="42" rx="6" fill="#15372D" />
      <circle cx="198" cy="62" r="10" fill="#FBBF24" fillOpacity="0.25" />
      <path d="M132 84 L152 70 L172 82 L192 74 L218 88" stroke="#52B788" strokeWidth="1.5" strokeOpacity="0.5" />
      <rect x="128" y="96" width="64" height="6" rx="3" fill="#F3F4F6" />
      <rect x="128" y="106" width="46" height="5" rx="2.5" fill="#9DA9A4" />
      <rect x="128" y="116" width="30" height="6" rx="3" fill="#52B788" />
    </svg>
  );
}

export function ThemeSystemCardPreview({ className = "w-full h-auto", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="split-left">
          <polygon points="0,0 135,0 105,140 0,140" />
        </clipPath>
        <clipPath id="split-right">
          <polygon points="135,0 240,0 240,140 105,140" />
        </clipPath>
      </defs>

      {/* Base border */}
      <rect width="240" height="140" rx="12" fill="none" stroke="#E5E7EB" strokeWidth="1.5" />

      {/* Left side: Light */}
      <g clipPath="url(#split-left)">
        <rect width="240" height="140" rx="12" fill="#FCFBF9" />
        <rect x="12" y="12" width="216" height="24" rx="6" fill="#FFFFFF" stroke="#E5E7EB" />
        <circle cx="24" cy="24" r="5" fill="#0F2922" />
        <rect x="36" y="21" width="32" height="6" rx="3" fill="#0F2922" />

        <rect x="12" y="44" width="102" height="84" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
        <rect x="16" y="48" width="94" height="42" rx="6" fill="#F0F2F1" />
        <circle cx="88" cy="62" r="10" fill="#E07A5F" fillOpacity="0.2" />
        <path d="M22 84 L40 68 L60 82 L78 72 L104 88" stroke="#0F2922" strokeWidth="1.5" strokeOpacity="0.3" />
        <rect x="18" y="96" width="60" height="6" rx="3" fill="#1A1F1D" />
        <rect x="18" y="106" width="40" height="5" rx="2.5" fill="#5A6460" />
        <rect x="18" y="116" width="28" height="6" rx="3" fill="#0F2922" />
      </g>

      {/* Right side: Dark */}
      <g clipPath="url(#split-right)">
        <rect width="240" height="140" rx="12" fill="#081713" />
        <rect x="12" y="12" width="216" height="24" rx="6" fill="#0F2820" stroke="#1F493D" />
        <rect x="176" y="19" width="44" height="10" rx="5" fill="#E07A5F" />

        <rect x="122" y="44" width="106" height="84" rx="8" fill="#0F2820" stroke="#1F493D" />
        <rect x="126" y="48" width="98" height="42" rx="6" fill="#15372D" />
        <circle cx="198" cy="62" r="10" fill="#FBBF24" fillOpacity="0.25" />
        <path d="M132 84 L152 70 L172 82 L192 74 L218 88" stroke="#52B788" strokeWidth="1.5" strokeOpacity="0.5" />
        <rect x="128" y="96" width="64" height="6" rx="3" fill="#F3F4F6" />
        <rect x="128" y="106" width="46" height="5" rx="2.5" fill="#9DA9A4" />
        <rect x="128" y="116" width="30" height="6" rx="3" fill="#52B788" />
      </g>

      {/* Diagonal dividing line */}
      <line x1="135" y1="0" x2="105" y2="140" stroke="#E07A5F" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

export function AccentSwatch({
  accent,
  selected = false,
  onClick,
  label,
  color1,
  color2,
}: {
  accent: "emerald" | "midnight" | "oasis";
  selected?: boolean;
  onClick: () => void;
  label: string;
  color1: string;
  color2: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
        selected
          ? "border-primary bg-surface-subtle shadow-sm ring-2 ring-primary/20"
          : "border-surface-border bg-surface hover:border-ink-secondary/30 hover:bg-surface-hover"
      }`}
      aria-pressed={selected}
    >
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-inner ring-1 ring-black/10">
        <svg viewBox="0 0 32 32" className="h-full w-full rounded-full">
          <defs>
            <linearGradient id={`grad-${accent}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill={`url(#grad-${accent})`} />
        </svg>
        {selected && (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
          >
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{label}</p>
      </div>
    </button>
  );
}
