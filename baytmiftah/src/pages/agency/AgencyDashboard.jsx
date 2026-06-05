import { useEffect } from 'react'
import { useAgencyStore } from '../../store/useAgencyStore'
import { useAuthStore } from '../../store'

export default function AgencyDashboard() {
  const { currentAgency, fetchAnalytics, analytics } = useAgencyStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (currentAgency?.id) {
      fetchAnalytics(currentAgency.id)
    }
  }, [currentAgency?.id])

  return (
    <div className="p-8">
      <h1 className="text-display-md font-bold mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-container rounded-lg p-6">
          <p className="text-on-surface-variant text-body-md mb-2">Total Listings</p>
          <p className="text-display-sm font-bold text-primary">
            {analytics?.total_listings || 0}
          </p>
        </div>
        <div className="bg-surface-container rounded-lg p-6">
          <p className="text-on-surface-variant text-body-md mb-2">Active Leads</p>
          <p className="text-display-sm font-bold text-secondary">
            {analytics?.active_leads || 0}
          </p>
        </div>
        <div className="bg-surface-container rounded-lg p-6">
          <p className="text-on-surface-variant text-body-md mb-2">Team Members</p>
          <p className="text-display-sm font-bold text-green-500">
            {analytics?.team_members || 0}
          </p>
        </div>
        <div className="bg-surface-container rounded-lg p-6">
          <p className="text-on-surface-variant text-body-md mb-2">Monthly Revenue</p>
          <p className="text-display-sm font-bold text-blue-500">
            ${analytics?.monthly_revenue || 0}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface-container rounded-lg p-6">
        <h2 className="text-body-lg font-medium mb-4">Quick Links</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="/agency/properties"
            className="p-4 border border-gray-700 rounded-lg hover:bg-surface transition"
          >
            <h3 className="font-medium mb-1">📋 View Properties</h3>
            <p className="text-on-surface-variant text-body-sm">Manage your listings</p>
          </a>
          <a
            href="/agency/leads"
            className="p-4 border border-gray-700 rounded-lg hover:bg-surface transition"
          >
            <h3 className="font-medium mb-1">💬 View Leads</h3>
            <p className="text-on-surface-variant text-body-sm">Track inquiries</p>
          </a>
          <a
            href="/agency/team"
            className="p-4 border border-gray-700 rounded-lg hover:bg-surface transition"
          >
            <h3 className="font-medium mb-1">👥 Manage Team</h3>
            <p className="text-on-surface-variant text-body-sm">Add/remove members</p>
          </a>
          <a
            href="/agency/analytics"
            className="p-4 border border-gray-700 rounded-lg hover:bg-surface transition"
          >
            <h3 className="font-medium mb-1">📊 View Analytics</h3>
            <p className="text-on-surface-variant text-body-sm">Business insights</p>
          </a>
        </div>
      </div>
    </div>
  )
}
