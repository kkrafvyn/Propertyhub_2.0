import { useEffect, useState } from 'react'
import agencyService from '../../services/agency-service'

export default function AgencyVerification() {
  const [pendingAgencies, setPendingAgencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAgency, setSelectedAgency] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadPendingAgencies()
  }, [])

  const loadPendingAgencies = async () => {
    try {
      setLoading(true)
      setError('')
      const agencies = await agencyService.getPendingVerificationAgencies()
      setPendingAgencies(agencies)
      setSelectedAgency((selected) =>
        selected ? agencies.find((agency) => agency.id === selected.id) || null : null
      )
    } catch (err) {
      setError(err.message || 'Unable to load pending agencies.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (agencyId) => {
    try {
      setError('')
      await agencyService.approveAgency(agencyId)
      setPendingAgencies((agencies) => agencies.filter((agency) => agency.id !== agencyId))
      setSelectedAgency(null)
    } catch (err) {
      setError(err.message || 'Unable to approve agency.')
    }
  }

  const handleReject = async (agencyId) => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection before rejecting the agency.')
      return
    }

    try {
      setError('')
      await agencyService.rejectAgency(agencyId, rejectReason)
      setPendingAgencies((agencies) => agencies.filter((agency) => agency.id !== agencyId))
      setSelectedAgency(null)
      setRejectReason('')
    } catch (err) {
      setError(err.message || 'Unable to reject agency.')
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-body-lg font-medium">
            Pending Agencies ({pendingAgencies.length})
          </h2>
          <button onClick={loadPendingAgencies} className="btn-secondary px-3 py-2 text-sm">
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <p className="rounded-lg bg-surface-container p-4 text-on-surface-variant">
              Loading pending agencies...
            </p>
          ) : (
            pendingAgencies.map((agency) => (
              <button
                key={agency.id}
                onClick={() => setSelectedAgency(agency)}
                className={`w-full rounded-lg p-4 text-left transition ${
                  selectedAgency?.id === agency.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-container hover:bg-surface'
                }`}
              >
                <h3 className="font-medium">{agency.name}</h3>
                <p className="text-body-sm text-gray-400">
                  {agency.verification_submitted_at
                    ? new Date(agency.verification_submitted_at).toLocaleDateString()
                    : new Date(agency.created_at).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedAgency ? (
        <div className="md:col-span-2">
          <div className="space-y-6 rounded-lg bg-surface-container p-6">
            <div>
              <h1 className="text-display-md mb-2 font-bold">{selectedAgency.name}</h1>
              <p className="text-on-surface-variant">
                Registration:{' '}
                {selectedAgency.ghana_business_registration_number || 'Not supplied'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-body-sm mb-1 text-on-surface-variant">Website</p>
                <p className="font-medium">{selectedAgency.website || 'Not supplied'}</p>
              </div>
              <div>
                <p className="text-body-sm mb-1 text-on-surface-variant">Email</p>
                <p className="font-medium">{selectedAgency.email || 'Not supplied'}</p>
              </div>
              <div>
                <p className="text-body-sm mb-1 text-on-surface-variant">Phone</p>
                <p className="font-medium">{selectedAgency.phone || 'Not supplied'}</p>
              </div>
              <div>
                <p className="text-body-sm mb-1 text-on-surface-variant">Tax ID</p>
                <p className="font-medium">
                  {selectedAgency.ghana_tax_identification_number || 'Not supplied'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-body-sm mb-2 text-on-surface-variant">Description</p>
              <p className="rounded-lg bg-surface p-4">
                {selectedAgency.description || 'No description submitted yet.'}
              </p>
            </div>

            <div>
              <h3 className="text-body-lg mb-3 font-medium">Submitted Documents</h3>
              <p className="rounded-lg bg-surface p-3 text-on-surface-variant">
                Verification document storage is not exposed by the current Supabase schema yet.
              </p>
            </div>

            <div>
              <p className="text-body-sm mb-2 text-on-surface-variant">
                Rejection Reason
              </p>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Enter reason for rejection..."
                className="h-24 w-full resize-none rounded-lg border border-gray-600 bg-surface px-4 py-2 text-white placeholder-gray-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedAgency.id)}
                className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(selectedAgency.id)}
                className="flex-1 rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center md:col-span-2">
          <p className="text-on-surface-variant">
            {pendingAgencies.length === 0 ? 'No pending agencies' : 'Select an agency to review'}
          </p>
        </div>
      )}
    </div>
  )
}
