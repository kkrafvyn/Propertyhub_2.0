import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { getRoleHomePath, isAdminRole, isAgencyRole, isAgentRole, isManageRole } from '../lib/roles'
import { USER_ROLES } from '../platform/registry'

const checks = {
  admin: (role) => isAdminRole(role),
  agency: (role) => isAgencyRole(role),
  agent: (role) => isAgentRole(role),
  developer: (role) => role === USER_ROLES.DEVELOPER,
  enterprise: (role) => role === USER_ROLES.ENTERPRISE_OPERATOR,
  manage: (role) => isManageRole(role),
}

export default function RoleProtectedRoute({ children, require = 'any', fallbackToLogin = true }) {
  const { user, role, profile, loading } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
      </div>
    )
  }

  if (!user) {
    return fallbackToLogin
      ? <Navigate to="/login" replace state={{ from: location.pathname }} />
      : null
  }

  if (require !== 'any') {
    const allowed = Array.isArray(require) ? require : [require]
    const ok = allowed.some((key) => checks[key]?.(role))
    if (!ok) {
      return (
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="text-xl font-semibold">{t('access.restricted')}</h1>
          <p className="mt-2 text-ink-secondary">
            {t('access.requires', { roles: allowed.join(' / '), role: t(`roles.${role || 'buyer'}`) })}
          </p>
          <a href={getRoleHomePath(user, profile)} className="mt-4 inline-block text-sm font-semibold text-ink underline">
            {t('access.goToWorkspace')}
          </a>        </div>
      )
    }
  }

  return children
}
