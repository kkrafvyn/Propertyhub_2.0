export function IconSearch({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M13 23a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm11 2-6.5-6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconHeart({ className = 'h-4 w-4', filled = false }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M16 27s-9-5.5-9-12a5.5 5.5 0 0 1 9.5-3.8A5.5 5.5 0 0 1 25 15c0 6.5-9 12-9 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

export function IconStar({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 4 19.5 13.5 29 14.5 22 21.5 24 31 16 26 8 31 10 21.5 3 14.5 12.5 13.5 16 4Z" />
    </svg>
  )
}

export function IconGlobe({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 16h22M16 5c3 3.5 4.5 7.5 4.5 11S19 29.5 16 27M16 5C13 8.5 11.5 12.5 11.5 16S13 23.5 16 27"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

export function IconMenu({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 10h20M6 16h20M6 22h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconHome({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 14 16 4l12 10v12H20V18H12v8H4V14Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconApartment({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="7" y="6" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 12h3M17 12h3M12 17h3M17 17h3M12 22h3M17 22h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconVilla({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 16 16 6l12 10v12H4V16Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M12 28V18h8v10" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconOffice({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 28V8l8-4 8 4v20" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M13 14h2M17 14h2M13 18h2M17 18h2M13 22h2M17 22h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconVerified({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 4 19 7l4-.5 1.5 3.8L28 12l-2 3.5 1 4-3.8 1.5L22 24l-3.5-2L15 24l-1.5-3.8L10 19l1-4-2-3.5 3.5-1.7L13 7l4-.5L16 4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 16l3 3 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const categoryIcons = {
  all: IconHome,
  apartment: IconApartment,
  house: IconVilla,
  office: IconOffice,
  verified: IconVerified,
}

export function IconUsers({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="12" cy="11" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="21" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 26c0-3.5 3.1-6 7-6M17 26c0-2.5 2-4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconCalendar({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 14h20M11 6v4M21 6v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconCheck({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 16.5 13.5 22 24 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSparkle({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 4v6M16 22v6M4 16h6M22 16h6M7.5 7.5l4 4M20.5 20.5l4 4M7.5 24.5l4-4M20.5 11.5l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconDocument({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M10 6h8l6 6v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M18 6v6h6M12 18h8M12 22h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconCard({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="24" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 14h24" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function IconWrench({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M10 22 20 12l2 2-10 10H8v-2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M19 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconPen({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 24 20 12l4 4L12 28H8v-4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevronLeft({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M20 8 10 16l10 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevronRight({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 8 22 16 12 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSliders({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 10h6M6 22h12M20 10h6M26 22h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="10" r="2" fill="currentColor" />
      <circle cx="22" cy="22" r="2" fill="currentColor" />
    </svg>
  )
}

export function IconMap({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 8 12 6v18l-6 2V8Zm12-2 8 2v18l-8-2V6ZM12 6l8 2v18l-8-2V6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconTownhouse({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 18 10 12l6 5 6-5 6 6v8H4v-7Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M12 25v-5h3v5M17 25v-5h3v5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLand({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 26h20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 26V14l6-6 6 6v12" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8 18c2-3 4-4 8-4s6 1 8 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconBed({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 20v6M26 20v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 20h24v-4H4v4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8 16V12a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export const propertyTypeIcons = {
  apartment: IconApartment,
  house: IconVilla,
  townhouse: IconTownhouse,
  office: IconOffice,
  land: IconLand,
  shortStay: IconBed,
}

export function IconSun({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M7.5 24.5l2-2M22.5 9.5l2-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconMoon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M20 6a10 10 0 1 0 8 16 8 8 0 0 1-8-16Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconClose({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M10 10 22 22M22 10 10 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconWarning({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 6 28 26H4L16 6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 13v6M16 22h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconBell({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 26h8M8 22h16l-2-3v-5a6 6 0 1 0-12 0v5l-2 3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconUser({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="11" r="4.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 27c0-4.5 3.6-8 8-8s8 3.5 8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconMessage({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 8h20v12H12l-4 4V8Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLock({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="9" y="14" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 14v-3a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconCamera({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 12h5l2-3h6l2 3h5v12H6V12Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="4" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function IconClimate({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 6v20M12 10h8M11 16h10M12 22h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function IconDroplet({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 6c4 6 8 10.5 8 15a8 8 0 1 1-16 0c0-4.5 4-9 8-15Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconAntenna({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 26V14M16 14c-3 0-5.5 2-5.5 4.5M16 14c3 0 5.5 2 5.5 4.5M16 10c-5 0-9 3.5-9 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="16" cy="26" r="2" fill="currentColor" />
    </svg>
  )
}

export function IconDot({ className = '' }) {
  return (
    <svg className={`h-1.5 w-1.5 shrink-0 ${className}`.trim()} viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}

export function IconPin({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 28s-6-5.5-6-12a6 6 0 1 1 12 0c0 6.5-6 12-6 12Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    </svg>
  )
}

export const deviceTypeIcons = {
  lock: IconLock,
  camera: IconCamera,
  climate: IconClimate,
  sensor: IconDroplet,
  default: IconAntenna,
}
