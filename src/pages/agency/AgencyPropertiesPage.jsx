import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAgencyListings } from '../../services/agency-service'

function Properties() {
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchAgencyListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  return (
    <AgencyShell titleKey="hubs.agency.properties.title" subtitleKey="hubs.agency.properties.subtitle">
      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((item) => (
          <article key={item.id} className="panel-card bg-surface p-5">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-ink-secondary">
              {item.views ? `${item.views} views · ` : ''}{item.status}
            </p>
            <Link to={`/property/${item.id}`} className="mt-4 inline-block text-sm font-semibold text-ink underline">
              View listing
            </Link>
          </article>
        ))}
      </div>
      <Link to="/host/list" className="mt-6 inline-block rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        Add property
      </Link>
    </AgencyShell>
  )
}

export default function AgencyPropertiesPage() {
  return <ProtectedRoute><Properties /></ProtectedRoute>
}
