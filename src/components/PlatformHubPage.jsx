import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from './DesktopShell'
import { HubLinkGrid, PageTitle } from './ui/AirbnbUI'

export default function PlatformHubPage({ title, subtitle, features = [], cta }) {
  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={title} subtitle={subtitle} />
      {features.length > 0 && (
        <div className="panel-card mb-8 p-6">
          <p className="mb-4 text-sm font-semibold text-ink">What&apos;s included</p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-ink-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cta && (
        <Link
          to={cta.to}
          className="inline-flex rounded-lg bg-brand-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {cta.label}
        </Link>
      )}
    </DesktopShell>
  )
}
