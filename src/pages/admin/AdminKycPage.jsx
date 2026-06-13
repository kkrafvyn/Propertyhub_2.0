import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchKycQueue, updateKycStatus } from '../../services/trust-service'

const statusStyles = {
  verified: 'bg-green-500/20 text-green-300',
  pending_review: 'bg-brand/20 text-brand',
  flagged: 'bg-red-500/20 text-red-300',
}

function Kyc() {
  const [kyc, setKyc] = useState([])

  useEffect(() => {
    fetchKycQueue().then(({ kyc: rows }) => setKyc(rows))
  }, [])

  async function handleVerify(id) {
    await updateKycStatus(id, 'verified')
    setKyc((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'verified' } : item)))
  }

  return (
    <AdminShell title="KYC / AML" subtitle="Identity verification and anti-money laundering checks">
      <div className="space-y-3">
        {kyc.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-white/5 p-4">
            <div>
              <p className="font-semibold">{item.entity || item.name}</p>
              <p className="text-sm text-white/70 capitalize">{item.type || item.entity_type} · {item.documents} documents</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[item.status] || statusStyles.pending_review}`}>
                {item.status.replace('_', ' ')}
              </span>
              {item.status !== 'verified' && (
                <button
                  type="button"
                  onClick={() => handleVerify(item.id)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-dark"
                >
                  Verify
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  )
}

export default function AdminKycPage() {
  return <ProtectedRoute><Kyc /></ProtectedRoute>
}
