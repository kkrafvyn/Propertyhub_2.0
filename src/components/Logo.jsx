import { Link } from 'react-router-dom'

const BRAND_GREEN = '#0F2922'

export function LogoMark({ className = 'h-9 w-9', inverted = false, ...props }) {
  const fill = inverted ? '#FFFFFF' : BRAND_GREEN
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
  )
}

export default function Logo({ to = '/', className = '', showText = true, size = 'md' }) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg'
  const markSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'

  return (
    <Link to={to} className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <LogoMark className={markSize} />
      {showText && (
        <span className={`${textSize} font-bold tracking-[0.14em] text-brand-forest`}>
          BΛYTMIFTΛH
        </span>
      )}
    </Link>
  )
}
