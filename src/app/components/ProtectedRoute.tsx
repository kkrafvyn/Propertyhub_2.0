import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, authAssurance } = useAuth()
  const location = useLocation()
  const nextPath = `${location.pathname}${location.search}`

  if (loading || authAssurance.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: nextPath }} />
  }

  if (authAssurance.currentLevel !== 'aal2' && authAssurance.nextLevel === 'aal2') {
    return (
      <Navigate
        to={`/login/verify?next=${encodeURIComponent(nextPath)}`}
        replace
      />
    )
  }

  return <>{children}</>
}
