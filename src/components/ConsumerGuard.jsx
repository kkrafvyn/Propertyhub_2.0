import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { getRoleHomePath, isConsumerPersona } from '../lib/roles'
import { isProRoute } from '../lib/consumer-nav'

/**
 * Blocks consumer personas from professional workspaces (agent, agency, admin, etc.).
 * Professionals retain access to their role home when denied.
 */
export default function ConsumerGuard({ children }) {
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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (isConsumerPersona(role) && isProRoute(location.pathname)) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">{t('access.restricted')}</h1>
        <p className="mt-2 text-ink-secondary">{t('consumer.access.proOnly')}</p>
        <a
          href={getRoleHomePath(user, profile)}
          className="mt-4 inline-block text-sm font-semibold text-ink underline"
        >
          {t('access.goToWorkspace')}
        </a>
      </div>
    )
  }

  return children
}
