import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AGENCY_ROLES, PLATFORM_ADMIN_ROLES } from '../lib/roles'

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

  const allowedRoles = Array.isArray(role) ? role : role ? [role] : null

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  if (requiresAgency) {
    const hasAgencyAccess =
      PLATFORM_ADMIN_ROLES.includes(user.role) ||
      AGENCY_ROLES.includes(user.role) ||
      Boolean(user.agency_id || user.agencyId)

    if (!hasAgencyAccess) {
      return <Navigate to="/agency/onboarding" replace />
    }
  }

  return children
}
