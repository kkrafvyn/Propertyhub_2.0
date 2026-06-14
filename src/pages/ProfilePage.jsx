import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { PageTitle, PanelCard } from '../components/ui/AirbnbUI'
import { LanguagePanel } from '../components/LanguageSwitcher'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { isAdminRole, isAgencyRole, isManageRole } from '../lib/roles'

function ProfileContent() {
  const { user, role, signOut } = useAuth()
  const { t } = useTranslation()

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('profile.account')} subtitle={t('profile.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <PanelCard>
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink text-2xl font-bold text-white">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <p className="mt-4 font-semibold text-ink">
              {user?.user_metadata?.display_name || t('profile.member')}
            </p>
            <p className="text-sm text-ink-secondary">{user?.email}</p>
            <p className="mt-3 inline-block rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold capitalize text-ink">
              {t(`roles.${role || 'buyer'}`)}
            </p>
          </div>
        </PanelCard>

        <div className="space-y-4">
          {(isManageRole(role) || role === 'buyer' || role === 'property_owner') && (
            <PanelCard title={t('profileNav.hosting')}>
              <NavRow to="/host/list" label={t('profileNav.listProperty')} />
              <NavRow to="/host/listings" label={t('profileNav.yourListings')} />
              <NavRow to="/host/boost" label={t('profileNav.featureListing')} />
            </PanelCard>
          )}
          {(isAgencyRole(role) || isAdminRole(role)) && (
            <PanelCard title={t('profileNav.moderation')}>
              <NavRow to="/admin/moderation" label={t('profileNav.reviewPending')} />
            </PanelCard>
          )}
          <PanelCard title={t('profileNav.accountInfo')}>
            <Row label={t('profileNav.email')} value={user?.email} />
            <Row label={t('profileNav.role')} value={t(`roles.${role || 'buyer'}`)} />
          </PanelCard>
          <PanelCard title={t('profileNav.workspaces')}>
            <NavRow to="/buyer" label={t('profileNav.buyerWorkspace')} />
            <NavRow to="/agent" label={t('profileNav.agentCrm')} />
            <NavRow to="/agency" label={t('profileNav.agencyErp')} />
            <NavRow to="/renter" label={t('profileNav.renterWorkspace')} />
            <NavRow to="/manage" label={t('profileNav.propertyManagement')} />
            <NavRow to="/smart" label={t('profileNav.smartProperty')} />
            <NavRow to="/finance" label={t('profileNav.financialServices')} />
            <NavRow to="/intelligence" label={t('profileNav.intelligenceHub')} />
            <NavRow to="/developer" label={t('profileNav.developerPlatform')} />
            <NavRow to="/enterprise" label={t('profileNav.enterpriseAssets')} />
            <NavRow to="/admin" label={t('profileNav.adminTrust')} />
          </PanelCard>
          <PanelCard title={t('profileNav.tripsTools')}>
            <NavRow to="/trips" label={t('profileNav.tripsViewings')} />
            <NavRow to="/transactions" label={t('profileNav.transactionCenter')} />
            <NavRow to="/buyer/advisor" label={t('profileNav.aiAdvisor')} />
            <NavRow to="/saved" label={t('profileNav.savedHomes')} />
            <NavRow to="/documents" label={t('profileNav.documentVault')} />
          </PanelCard>
          <PanelCard title={t('profile.language')}>
            <LanguagePanel />
          </PanelCard>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-ink px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-hover"
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
    <div className="flex justify-between border-b border-surface-border py-3 text-sm last:border-0">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function NavRow({ to, label }) {
  return (
    <Link
      to={to}
      className="flex justify-between border-b border-surface-border py-3 text-sm font-medium text-ink last:border-0 hover:underline"
    >
      {label}
      <span className="text-ink-secondary">→</span>
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
