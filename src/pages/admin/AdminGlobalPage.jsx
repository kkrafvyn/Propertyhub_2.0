import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchGlobalRegions } from '../../services/trust-service'

const statusStyles = {
  live: 'bg-green-500/20 text-green-300',
  beta: 'bg-brand/20 text-brand',
  planned: 'bg-white/10 text-white/50',
}

function Global() {
  const [regions, setRegions] = useState([])

  useEffect(() => {
    fetchGlobalRegions().then(({ regions: rows }) => setRegions(rows))
  }, [])

  return (
    <AdminShell title="Multi-region & multi-currency" subtitle="Market expansion and localization settings">
      <div className="overflow-hidden rounded-card border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Currency</th>
              <th className="px-4 py-3 font-semibold">Listings</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.code} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 font-mono">{r.code}</td>
                <td className="px-4 py-3">{r.currency}</td>
                <td className="px-4 py-3">{r.listings.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[r.status]}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-white/70">Payment rails: Paystack (Africa) · Stripe (international). Currency conversion at checkout.</p>
    </AdminShell>
  )
}

export default function AdminGlobalPage() {
  return <ProtectedRoute><Global /></ProtectedRoute>
}
