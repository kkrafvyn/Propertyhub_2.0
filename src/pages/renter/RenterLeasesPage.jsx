import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchLeases } from '../../services/renter-service'

function Leases() {
  const [leases, setLeases] = useState([])

  useEffect(() => {
    fetchLeases().then(({ leases: rows }) => setLeases(rows))
  }, [])

  return (
    <RenterShell titleKey="hubs.renter.leases.title" subtitleKey="hubs.renter.leases.subtitle">
      <div className="space-y-4">
        {leases.map((lease) => (
          <article key={lease.id} className="panel-card bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{lease.property}</h2>
                <p className="text-sm text-ink-secondary">{lease.landlord}</p>
              </div>
              <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold capitalize text-ink">{lease.status}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <p><span className="text-ink-secondary">Start:</span> {lease.start}</p>
              <p><span className="text-ink-secondary">End:</span> {lease.end}</p>
              <p><span className="text-ink-secondary">Rent:</span> GHS {lease.rent.toLocaleString()}</p>
            </div>
            {lease.signed && (
              <p className="mt-3 text-xs font-semibold text-green-700">✓ Digitally signed</p>
            )}
          </article>
        ))}
      </div>
    </RenterShell>
  )
}

export default function RenterLeasesPage() {
  return <ProtectedRoute><Leases /></ProtectedRoute>
}
