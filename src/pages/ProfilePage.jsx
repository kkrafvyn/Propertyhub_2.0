import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { AppSettingsPanels } from '../components/AppSettings'
import { PageTitle, PanelCard } from '../components/ui/AirbnbUI'
import { IconChevronRight } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { useRoleNavigation } from '../lib/role-navigation'
import { fetchMyReputation } from '../services/trust-service'

function ProfileContent() {
  const { user, role, signOut } = useAuth()
  const { t } = useTranslation()
  const { workspaces, tools, hosting, workspaceTitle } = useRoleNavigation(role)
  const [reputation, setReputation] = useState(null)
  const [reputationSource, setReputationSource] = useState('local')

  useEffect(() => {
    if (!user?.id) return
    fetchMyReputation(user.id).then(({ reputation: rep, source }) => {
      setReputation(rep)
      setReputationSource(source)
    })
  }, [user?.id])

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('profile.account')} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <PanelCard>
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-ink">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <p className="mt-4 font-semibold text-ink">
              {user?.user_metadata?.display_name || t('profile.member')}
            </p>
            <p className="text-sm text-ink-secondary">{user?.email}</p>
            <p className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize text-ink">
              {t(`roles.${role || 'consumer'}`)}
            </p>
          </div>
        </PanelCard>

        <div className="space-y-4">
          <PanelCard title={t('profile.settings')} subtitle={t('profile.settingsDesc')}>
            <AppSettingsPanels />
          </PanelCard>

          <PanelCard title={t('profileNav.accountInfo')}>
            <Row label={t('profileNav.email')} value={user?.email} />
            <Row label={t('profileNav.role')} value={t(`roles.${role || 'consumer'}`)} />
          </PanelCard>

          {reputation && (
            <PanelCard title={t('profile.reputation')} subtitle={t('profile.reputationDesc')}>
              <Row label={t('profile.reputationScore')} value={`${Math.round(reputation.score ?? 50)}/100`} />
              {reputation.factors && (
                <>
                  <Row label={t('profile.reputationReviews')} value={String(reputation.factors.review_count ?? 0)} />
                  <Row label={t('profile.reputationPayments')} value={String(reputation.factors.payments ?? 0)} />
                  {reputation.factors.response_score != null && (
                    <Row label={t('profile.reputationResponse')} value={`${reputation.factors.response_score}%`} />
                  )}
                </>
              )}
              {(reputation.badges ?? reputation.factors?.badges)?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(reputation.badges ?? reputation.factors?.badges).map((badge) => (
                    <span key={badge} className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-ink">{badge}</span>
                  ))}
                </div>
              )}
              {reputationSource === 'local' && (
                <p className="mt-2 text-xs text-ink-secondary">{t('profile.reputationLocalHint')}</p>
              )}
            </PanelCard>
          )}

          {hosting.length > 0 && (
            <PanelCard title={t('profileNav.hosting')}>
              {hosting.map(({ to, label }) => (
                <NavRow key={to} to={to} label={label} />
              ))}
            </PanelCard>
          )}

          {workspaces.length > 0 && (
            <PanelCard title={workspaceTitle}>
              {workspaces.map(({ to, label }) => (
                <NavRow key={to} to={to} label={label} />
              ))}
            </PanelCard>
          )}

          {tools.length > 0 && (
            <PanelCard title={t('profileNav.tripsTools')}>
              {tools.map(({ to, label }) => (
                <NavRow key={to} to={to} label={label} />
              ))}
            </PanelCard>
          )}

          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-white/10"
          >
            {t('profile.logOut')}
          </button>
        </div>
      </div>
    </DesktopShell>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/10 py-3 text-sm last:border-0">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function NavRow({ to, label }) {
  return (
    <Link
      to={to}
      className="flex justify-between border-b border-white/10 py-3 text-sm font-medium text-ink last:border-0 hover:underline"
    >
      {label}
      <IconChevronRight className="h-4 w-4 text-ink-secondary" />
    </Link>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
