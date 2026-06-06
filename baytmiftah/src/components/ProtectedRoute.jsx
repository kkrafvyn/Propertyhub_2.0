import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({
  user,
  role = null,
  requiresAgency = false,
  children,
}) {
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  if (requiresAgency) {
    const hasAgencyAccess =
      user.role === 'admin' ||
      user.role === 'agent' ||
      user.role === 'agency_admin' ||
      Boolean(user.agency_id || user.agencyId)

    if (!hasAgencyAccess) {
      return <Navigate to="/agency/onboarding" replace />
    }
  }

  return children
}
