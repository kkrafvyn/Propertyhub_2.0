import { Link, NavLink } from 'react-router-dom'
import DesktopShell, { CompactSearch } from './DesktopShell'
import { PageTitle } from './ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'

export default function WorkspaceShell({
  workspaceLabel,
  homePath = '/',
  links = [],
  children,
  title,
  subtitle,
  titleKey,
  subtitleKey,
  titleVars,
  subtitleVars,
  headerAction,
}) {
  const { t } = useTranslation()
  const resolvedTitle = titleKey ? t(titleKey, titleVars) : title
  const resolvedSubtitle = subtitleKey ? t(subtitleKey, subtitleVars) : subtitle

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="mb-6 lg:mb-0">
          <div className="lg:sticky lg:top-28">
            <Link
              to={homePath}
              className="mb-4 hidden text-sm font-semibold text-ink underline lg:inline-block"
            >
              {workspaceLabel}
            </Link>

            <nav className="listing-scroll flex gap-2 lg:flex-col lg:gap-0 lg:overflow-visible">
              {links.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `workspace-nav-link whitespace-nowrap ${isActive ? 'active' : ''}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          {(resolvedTitle || resolvedSubtitle) && (
            <PageTitle title={resolvedTitle} subtitle={resolvedSubtitle} action={headerAction} />
          )}
          {children}
        </main>
      </div>
    </DesktopShell>
  )
}
