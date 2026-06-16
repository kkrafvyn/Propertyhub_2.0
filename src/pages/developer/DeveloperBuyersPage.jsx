import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { fetchDeveloperBuyers, linkBuyerTransaction } from '../../services/developer-service'

function Buyers() {
  const [buyers, setBuyers] = useState([])
  const [linkTarget, setLinkTarget] = useState(null)
  const [transactionId, setTransactionId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDeveloperBuyers().then(({ buyers: rows }) => setBuyers(rows))
  }, [])

  async function handleLink() {
    if (!linkTarget || !transactionId.trim()) return
    setLoading(true)
    const result = await linkBuyerTransaction({ buyerId: linkTarget.id, transactionId: transactionId.trim() })
    if (result?.ok) {
      setBuyers((prev) => prev.map((b) => (
        b.id === linkTarget.id ? { ...b, transactionId: transactionId.trim(), stage: 'under_contract' } : b
      )))
    }
    setLinkTarget(null)
    setTransactionId('')
    setLoading(false)
  }

  return (
    <DeveloperShell titleKey="hubs.developer.buyers.title" subtitleKey="hubs.developer.buyers.subtitle">
      <div className="overflow-hidden panel-card bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Buyer</th>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Paid</th>
              <th className="px-4 py-3 font-semibold">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((b) => (
              <tr key={b.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{b.project}</td>
                <td className="px-4 py-3">{b.unit}</td>
                <td className="px-4 py-3 capitalize">{String(b.stage).replace('_', ' ')}</td>
                <td className="px-4 py-3 font-semibold text-ink">{b.paid}</td>
                <td className="px-4 py-3">
                  {b.transactionId ? (
                    <Link to="/transactions" className="font-semibold text-brand-accent underline">{b.transactionId}</Link>
                  ) : (
                    <button type="button" onClick={() => setLinkTarget(b)} className="text-xs font-semibold text-brand-accent underline">
                      Link transaction
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {linkTarget && (
        <QuickFormModal title={`Link transaction — ${linkTarget.name}`} onClose={() => setLinkTarget(null)} onSubmit={handleLink} submitLabel="Link" loading={loading}>
          <ModalField label="Transaction ID">
            <input className={modalInputClassName()} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="tx-…" />
          </ModalField>
        </QuickFormModal>
      )}
    </DeveloperShell>
  )
}

export default function DeveloperBuyersPage() {
  return <ProtectedRoute><Buyers /></ProtectedRoute>
}
