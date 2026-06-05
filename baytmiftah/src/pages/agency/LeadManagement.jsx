import { useEffect, useState } from 'react'
import { useAgencyStore } from '../../store/useAgencyStore'

export default function LeadManagement() {
  const { currentAgency, leads, fetchLeads, loading } = useAgencyStore()
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (currentAgency?.id) {
      fetchLeads(currentAgency.id)
    }
  }, [currentAgency?.id])

  const filteredLeads = leads.filter((lead) => {
    if (filter === 'all') return true
    return lead.status === filter
  })

  return (
    <div>
      <h1 className="text-display-md font-bold mb-8">Lead Management</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Total Leads</p>
          <p className="text-display-sm font-bold text-primary">{leads.length}</p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">New</p>
          <p className="text-display-sm font-bold text-blue-500">
            {leads.filter((l) => l.status === 'new').length}
          </p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Assigned</p>
          <p className="text-display-sm font-bold text-yellow-500">
            {leads.filter((l) => l.status === 'assigned').length}
          </p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Closed</p>
          <p className="text-display-sm font-bold text-green-500">
            {leads.filter((l) => l.status === 'closed').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'new', 'assigned', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition capitalize ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-surface-container text-gray-400 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-surface-container rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-surface">
                <th className="px-6 py-3 text-left text-body-md font-medium">Name</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Property Interest</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Status</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Assigned To</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-700 hover:bg-surface transition">
                  <td className="px-6 py-3 font-medium">{lead.name}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{lead.property_interest}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-body-sm capitalize ${
                        lead.status === 'new'
                          ? 'bg-blue-500/20 text-blue-400'
                          : lead.status === 'assigned'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">{lead.assigned_to || '-'}</td>
                  <td className="px-6 py-3 text-on-surface-variant">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
