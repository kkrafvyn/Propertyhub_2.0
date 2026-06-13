import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { fetchListings } from '../services/marketplace-service'
import { getCompareIds, clearCompare } from '../lib/compare-listings'

export default function ComparePage() {
  const [listings, setListings] = useState([])
  const ids = getCompareIds()

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => {
      setListings(rows.filter((l) => ids.includes(l.id)))
    })
  }, [ids.join(',')])

  const rows = [
    { label: 'Price', key: 'priceLabel' },
    { label: 'Location', key: 'location' },
    { label: 'Bedrooms', key: 'bedrooms' },
    { label: 'Bathrooms', key: 'bathrooms' },
    { label: 'Sqft', key: 'sqft' },
    { label: 'Rating', key: 'rating' },
    { label: 'Type', key: 'type' },
    { label: 'Verified', key: 'verified' },
  ]

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compare properties</h1>
          <p className="mt-1 text-ink-secondary">Up to 4 homes side by side</p>
        </div>
        {listings.length > 0 && (
          <button type="button" onClick={clearCompare} className="text-sm font-medium text-ink-secondary underline">
            Clear all
          </button>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="mt-12 rounded-card border border-surface-border bg-surface-subtle py-16 text-center">
          <p className="text-ink-secondary">Add properties using the compare button on listing cards.</p>
          <Link to="/" className="mt-4 inline-block rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand">
            Browse homes
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-surface-border bg-surface-subtle p-3 text-left" />
                {listings.map((l) => (
                  <th key={l.id} className="min-w-[200px] border border-surface-border p-3 text-left">
                    <img src={l.image} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
                    <Link to={`/property/${l.id}`} className="font-semibold hover:underline">{l.title}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, key }) => (
                <tr key={key}>
                  <td className="border border-surface-border bg-surface-subtle p-3 font-medium">{label}</td>
                  {listings.map((l) => (
                    <td key={l.id} className="border border-surface-border p-3">
                      {key === 'verified' ? (l.verified ? 'Yes' : 'No') : l[key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <Link to="/tools/mortgage" className="text-sm font-semibold text-brand-dark underline">Mortgage estimator →</Link>
        <Link to="/tools/investment" className="text-sm font-semibold text-brand-dark underline">Investment calculator →</Link>
      </div>
    </DesktopShell>
  )
}
