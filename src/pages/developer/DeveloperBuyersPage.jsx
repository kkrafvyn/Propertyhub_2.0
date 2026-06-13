import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchDeveloperBuyers } from '../../services/developer-service'

function Buyers() {
  const [buyers, setBuyers] = useState([])

  useEffect(() => {
    fetchDeveloperBuyers().then(({ buyers: rows }) => setBuyers(rows))
  }, [])

  return (
    <DeveloperShell title="Buyer portal" subtitle="Pre-sales pipeline and payment progress">
      <div className="overflow-hidden rounded-card border border-surface-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Buyer</th>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Paid</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((b) => (
              <tr key={b.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{b.project}</td>
                <td className="px-4 py-3">{b.unit}</td>
                <td className="px-4 py-3 capitalize">{b.stage.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-semibold text-brand-dark">{b.paid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DeveloperShell>
  )
}

export default function DeveloperBuyersPage() {
  return <ProtectedRoute><Buyers /></ProtectedRoute>
}
