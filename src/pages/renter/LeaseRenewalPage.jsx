import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { fetchLeases, requestLeaseRenewal } from '../../services/renter-service'

function RenewalForm() {
  const [params] = useSearchParams()
  const preselected = params.get('lease')
  const [leases, setLeases] = useState([])
  const [leaseId, setLeaseId] = useState(preselected ?? '')
  const [termMonths, setTermMonths] = useState('12')
  const [proposedRent, setProposedRent] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchLeases().then(({ leases: rows }) => {
      setLeases(rows)
      if (!preselected && rows[0]) setLeaseId(rows[0].id)
      else if (preselected) setLeaseId(preselected)
    })
  }, [preselected])

  const selected = leases.find((l) => l.id === leaseId)

  async function handleSubmit() {
    if (!leaseId) return
    setLoading(true)
    setMessage('')
    const result = await requestLeaseRenewal({
      leaseId,
      termMonths: Number(termMonths) || 12,
      proposedRent: proposedRent ? Number(proposedRent) : selected?.rent,
      notes,
    })
    setMessage(result?.message ?? 'Renewal request submitted — your landlord will review it.')
    setLoading(false)
  }

  return (
    <RenterShell titleKey="hubs.renter.leases.title" subtitleKey="hubs.renter.leases.subtitle">
      <div className="max-w-lg space-y-4">
        <p className="text-sm text-ink-secondary">
          Request a lease extension before your current term ends. Your landlord receives the proposed terms for approval.
        </p>

        {message && (
          <p className="rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
        )}

        <ModalField label="Lease">
          <select
            className={modalInputClassName()}
            value={leaseId}
            onChange={(e) => {
              setLeaseId(e.target.value)
              const lease = leases.find((l) => l.id === e.target.value)
              if (lease) setProposedRent(String(lease.rent ?? ''))
            }}
          >
            {leases.map((l) => (
              <option key={l.id} value={l.id}>{l.property} — ends {l.end}</option>
            ))}
          </select>
        </ModalField>

        <ModalField label="Extension (months)">
          <input type="number" min="1" className={modalInputClassName()} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
        </ModalField>

        <ModalField label="Proposed monthly rent (GHS)">
          <input type="number" className={modalInputClassName()} value={proposedRent} onChange={(e) => setProposedRent(e.target.value)} placeholder={selected?.rent ? String(selected.rent) : ''} />
        </ModalField>

        <ModalField label="Notes for landlord">
          <textarea className={modalInputClassName('min-h-[88px]')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional message" />
        </ModalField>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !leaseId}
            className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit renewal request'}
          </button>
          <Link to="/renter/leases" className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold">
            Back to leases
          </Link>
        </div>
      </div>
    </RenterShell>
  )
}

export default function LeaseRenewalPage() {
  return <ProtectedRoute><RenewalForm /></ProtectedRoute>
}
