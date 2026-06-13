import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from './DesktopShell'

export default function PlatformHubPage({ title, subtitle, features = [], cta }) {
  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mx-auto max-w-3xl py-8">
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">Coming online</span>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-lg text-ink-secondary">{subtitle}</p>
        {features.length > 0 && (
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-ink-secondary">
                <span className="h-2 w-2 rounded-full bg-brand" />
                {f}
              </li>
            ))}
          </ul>
        )}
        {cta && (
          <Link to={cta.to} className="mt-8 inline-block rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand">
            {cta.label}
          </Link>
        )}
      </div>
    </DesktopShell>
  )
}
