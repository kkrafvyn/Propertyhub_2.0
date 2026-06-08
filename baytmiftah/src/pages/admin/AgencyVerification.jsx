import { useEffect, useState } from 'react'
import AdminPageShell from '../../components/AdminPageShell'
import agencyService from '../../services/agency-service'

export default function AgencyVerification() {
  const [pendingAgencies, setPendingAgencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAgency, setSelectedAgency] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')
  const [queueFilter, setQueueFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')

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

  const reviewChecklist = [
    'Business registration number matches submitted agency name',
    'Tax ID is present or flagged for follow-up',
    'Contact email and phone are usable for verification',
    'Agency description and website align with the claimed market',
  ]
  const filteredAgencies = pendingAgencies.filter((agency) => {
    const searchable = [
      agency.name,
      agency.email,
      agency.phone,
      agency.website,
      agency.ghana_business_registration_number,
      agency.ghana_tax_identification_number,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = !search.trim() || searchable.includes(search.trim().toLowerCase())
    const matchesQueue =
      queueFilter === 'all' ||
      (queueFilter === 'missing-tax'
        ? !agency.ghana_tax_identification_number
        : queueFilter === 'has-website'
          ? Boolean(agency.website)
          : agency.verification_status === queueFilter)
    const riskScore = [
      !agency.ghana_tax_identification_number,
      !agency.website,
      !agency.email,
      !agency.phone,
    ].filter(Boolean).length
    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'high' && riskScore >= 2) ||
      (riskFilter === 'medium' && riskScore === 1) ||
      (riskFilter === 'low' && riskScore === 0)

    return matchesSearch && matchesQueue && matchesRisk
  })

  return (
    <AdminPageShell title="Agency Verification">
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-body-lg font-medium">
            Pending Agencies ({filteredAgencies.length})
          </h2>
          <button onClick={loadPendingAgencies} className="btn-secondary px-3 py-2 text-sm">
            Refresh
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            ['all', 'All'],
            ['pending', 'Pending'],
            ['missing-tax', 'Missing Tax'],
            ['has-website', 'Website'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setQueueFilter(value)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                queueFilter === value ? 'bg-primary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="mb-4 block">
          <span className="sr-only">Search review queue</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search agencies..."
            className="input-field"
          />
        </label>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            ['all', 'Risk'],
            ['high', 'High'],
            ['medium', 'Med'],
            ['low', 'Low'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRiskFilter(value)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                riskFilter === value ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
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
          ) : filteredAgencies.length > 0 ? (
            filteredAgencies.map((agency) => (
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
                <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">
                  {[!agency.ghana_tax_identification_number && 'missing tax', !agency.website && 'no website']
                    .filter(Boolean)
                    .join(' / ') || 'low risk'}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-gray-700 bg-surface-container p-5">
              <span className="material-symbols-outlined text-4xl text-primary">verified_user</span>
              <h3 className="mt-3 font-bold">Verification queue clear</h3>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                New agency submissions will appear here after onboarding and document upload.
              </p>
            </div>
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
                {selectedAgency.description || 'Description missing. Ask the agency to add a short operating profile before approval.'}
              </p>
            </div>

            <div>
              <h3 className="text-body-lg mb-3 font-medium">Submitted Documents</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {reviewChecklist.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg bg-surface p-3">
                    <span className="material-symbols-outlined text-primary">fact_check</span>
                    <p className="text-body-sm text-on-surface-variant">{item}</p>
                  </div>
                ))}
              </div>
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
          <div className="max-w-xl rounded-lg border border-gray-700 bg-surface-container p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-primary">
              {pendingAgencies.length === 0 ? 'task_alt' : 'rule_settings'}
            </span>
            <h2 className="mt-4 text-headline-md font-bold">
              {pendingAgencies.length === 0 ? 'No agencies waiting for review' : 'Select an agency to review'}
            </h2>
            <p className="mt-2 text-on-surface-variant">
              {pendingAgencies.length === 0
                ? 'The verification queue is clear. Use refresh when a new onboarding request is submitted.'
                : 'Open a submission from the queue to inspect identity, registration, contact, and approval details.'}
            </p>
            <button onClick={loadPendingAgencies} className="btn-secondary mt-5 px-4 py-2">
              Refresh queue
            </button>
          </div>
        </div>
      )}
    </div>
    </AdminPageShell>
  )
}
