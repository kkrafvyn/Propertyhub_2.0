import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ user, role = null, children }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}
