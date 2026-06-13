import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-9 w-9', ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#051424" />
      <path
        d="M8 22V12l8-6 8 6v10H18v-6h-4v6H8Z"
        stroke="#E9C349"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Logo({ to = '/', className = '', showText = true, size = 'md' }) {
  const textSize = size === 'sm' ? 'text-base' : 'text-xl'
  const markSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'

  return (
    <Link to={to} className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <LogoMark className={markSize} />
      {showText && (
        <span className={`${textSize} font-bold tracking-tight text-brand-dark`}>BaytMiftah</span>
      )}
    </Link>
  )
}
