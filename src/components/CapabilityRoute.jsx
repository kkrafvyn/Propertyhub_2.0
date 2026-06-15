import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasCapability } from '../lib/capabilities'

export default function CapabilityRoute({ require: required, children, fallback = '/consumer' }) {
  const { user, loading, capabilities } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!hasCapability(capabilities, required)) {
    return <Navigate to={fallback} replace />
  }

  return children
}
