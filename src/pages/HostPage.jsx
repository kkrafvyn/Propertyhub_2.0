import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { PageTitle, SecondaryButton } from '../components/ui/AirbnbUI'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'

export default function HostPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const listed = location.state?.listed

  if (!user) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <div className="mx-auto max-w-xl py-12 text-center">
          <PageTitle
            title={t('host.title')}
            subtitle={t('host.signInSubtitle')}
          />
          <div className="flex justify-center gap-4">
            <SecondaryButton as={Link} to="/login">{t('auth.logIn')}</SecondaryButton>
            <Link
              to="/signup"
              className="inline-flex rounded-lg bg-brand-accent px-6 py-3.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      {listed && (
        <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t('host.submitted')}
        </p>
      )}
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <PageTitle
            title={t('host.heroTitle')}
            subtitle={t('host.heroSubtitle')}
          />
          <ul className="space-y-3 text-ink-secondary">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              {t('host.benefit1')}
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              {t('host.benefit2')}
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              {t('host.benefit3')}
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/host/list"
              className="inline-flex rounded-lg bg-brand-accent px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('host.getStarted')}
            </Link>
            <SecondaryButton as={Link} to="/host/listings">{t('host.yourListings')}</SecondaryButton>
            <SecondaryButton as={Link} to="/host/boost">{t('host.featureListing')}</SecondaryButton>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl shadow-card">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </div>
    </DesktopShell>
  )
}
