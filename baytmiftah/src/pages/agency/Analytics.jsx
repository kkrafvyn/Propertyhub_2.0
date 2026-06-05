import { useEffect } from 'react'
import { useAgencyStore } from '../../store/useAgencyStore'

export default function Analytics() {
  const { currentAgency, analytics, fetchAnalytics } = useAgencyStore()

  useEffect(() => {
    if (currentAgency?.id) {
      fetchAnalytics(currentAgency.id)
    }
  }, [currentAgency?.id])

  const stats = [
    { label: 'Total Listings', value: analytics?.total_listings || 0, icon: '📋' },
    { label: 'Active Listings', value: analytics?.active_listings || 0, icon: '✓' },
    { label: 'Sold Properties', value: analytics?.sold_properties || 0, icon: '🎉' },
    { label: 'Total Leads', value: analytics?.total_leads || 0, icon: '💬' },
    { label: 'Conversion Rate', value: `${analytics?.conversion_rate || 0}%`, icon: '📈' },
    { label: 'Avg Days on Market', value: analytics?.avg_days_on_market || 0, icon: '📅' },
  ]

  return (
    <div>
      <h1 className="text-display-md font-bold mb-8">Analytics & Reports</h1>

      {/* Statistics Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-surface-container rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-on-surface-variant text-body-md mb-2">{stat.label}</p>
                <p className="text-display-sm font-bold text-primary">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-container rounded-lg p-6">
          <h3 className="text-body-lg font-medium mb-4">Monthly Revenue</h3>
          <div className="h-48 bg-surface rounded-lg flex items-center justify-center text-gray-500">
            Chart coming soon
          </div>
        </div>
        <div className="bg-surface-container rounded-lg p-6">
          <h3 className="text-body-lg font-medium mb-4">Lead Sources</h3>
          <div className="h-48 bg-surface rounded-lg flex items-center justify-center text-gray-500">
            Chart coming soon
          </div>
        </div>
      </div>

      {/* Top Agents */}
      <div className="bg-surface-container rounded-lg p-6">
        <h3 className="text-body-lg font-medium mb-4">Top Performing Agents</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-surface rounded-lg">
              <div>
                <p className="font-medium">Agent {i}</p>
                <p className="text-body-sm text-gray-400">{20 - i * 3} sales</p>
              </div>
              <div className="text-right">
                <p className="font-medium">${(50000 - i * 5000).toLocaleString()}</p>
                <p className="text-body-sm text-green-400">+12%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
