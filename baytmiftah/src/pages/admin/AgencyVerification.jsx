import { useEffect, useState } from 'react'
import agencyService from '../../services/agency-service'

export default function AgencyVerification() {
  const [pendingAgencies, setPendingAgencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAgency, setSelectedAgency] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadPendingAgencies()
  }, [])

  const loadPendingAgencies = async () => {
    try {
      setLoading(true)
      const agencies = await agencyService.getVerificationStatus()
      setPendingAgencies(agencies.filter((a) => a.verification_status === 'pending'))
    } catch (error) {
      console.error('Error loading agencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (agencyId) => {
    try {
      await agencyService.approveAgency(agencyId)
      setPendingAgencies(pendingAgencies.filter((a) => a.id !== agencyId))
      setSelectedAgency(null)
    } catch (error) {
      console.error('Error approving agency:', error)
    }
  }

  const handleReject = async (agencyId) => {
    if (!rejectReason) {
      alert('Please provide a reason for rejection')
      return
    }
    try {
      await agencyService.rejectAgency(agencyId, rejectReason)
      setPendingAgencies(pendingAgencies.filter((a) => a.id !== agencyId))
      setSelectedAgency(null)
      setRejectReason('')
    } catch (error) {
      console.error('Error rejecting agency:', error)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Pending Agencies List */}
      <div className="md:col-span-1">
        <h2 className="text-body-lg font-medium mb-4">Pending Agencies ({pendingAgencies.length})</h2>
        <div className="space-y-2">
          {pendingAgencies.map((agency) => (
            <button
              key={agency.id}
              onClick={() => setSelectedAgency(agency)}
              className={`w-full p-4 rounded-lg text-left transition ${
                selectedAgency?.id === agency.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-container hover:bg-surface'
              }`}
            >
              <h3 className="font-medium">{agency.company_name}</h3>
              <p className="text-body-sm text-gray-400">
                {new Date(agency.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Agency Details */}
      {selectedAgency ? (
        <div className="md:col-span-2">
          <div className="bg-surface-container rounded-lg p-6 space-y-6">
            <div>
              <h1 className="text-display-md font-bold mb-2">{selectedAgency.company_name}</h1>
              <p className="text-on-surface-variant">License: {selectedAgency.license_number}</p>
            </div>

            {/* Agency Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-on-surface-variant text-body-sm mb-1">Website</p>
                <p className="font-medium">{selectedAgency.website}</p>
              </div>
              <div>
                <p className="text-on-surface-variant text-body-sm mb-1">Email</p>
                <p className="font-medium">{selectedAgency.email}</p>
              </div>
              <div>
                <p className="text-on-surface-variant text-body-sm mb-1">Phone</p>
                <p className="font-medium">{selectedAgency.phone}</p>
              </div>
              <div>
                <p className="text-on-surface-variant text-body-sm mb-1">Location</p>
                <p className="font-medium">
                  {selectedAgency.city}, {selectedAgency.country}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-on-surface-variant text-body-sm mb-2">Description</p>
              <p className="bg-surface rounded-lg p-4">{selectedAgency.description}</p>
            </div>

            {/* Documents Section */}
            <div>
              <h3 className="text-body-lg font-medium mb-3">Submitted Documents</h3>
              <div className="space-y-2">
                {selectedAgency.documents?.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-surface rounded-lg hover:bg-surface/80 transition"
                  >
                    <span>📄</span>
                    <span className="flex-1">{doc.name}</span>
                    <span className="text-gray-400">↗</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Rejection Reason (if rejecting) */}
            <div>
              <p className="text-on-surface-variant text-body-sm mb-2">
                Rejection Reason (if applicable)
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 h-24 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedAgency.id)}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleReject(selectedAgency.id)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="md:col-span-2 flex items-center justify-center">
          <p className="text-on-surface-variant">
            {pendingAgencies.length === 0 ? 'No pending agencies' : 'Select an agency to review'}
          </p>
        </div>
      )}
    </div>
  )
}
