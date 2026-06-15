import { Navigate, useLocation } from 'react-router-dom'

/** Redirect old /m/* bookmarks to clean paths (e.g. /m/explore → /explore). */
export default function LegacyMobileRedirect({ children }) {
  const { pathname, search, hash } = useLocation()

  if (pathname === '/m' || pathname.startsWith('/m/')) {
    const next = pathname.replace(/^\/m/, '') || '/'
    return <Navigate to={{ pathname: next, search, hash }} replace />
  }

  return children
}
