import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function AdminDashboard() {
  const [users] = useState([
    {
      id: 1,
      name: 'Julian De Marco',
      email: 'uid.992834371',
      role: 'Elite Agent',
      verification: 'Tier 3 (Ultra)',
      status: 'Active',
      region: 'Dubai, UAE',
      lastActivity: '2 mins ago',
    },
    {
      id: 2,
      name: 'Elena Kostic',
      email: 'uid.10234847',
      role: 'Buyer',
      verification: 'Tier 1 (Basic)',
      status: 'Idle',
      region: 'London, UK',
      lastActivity: '14 hrs ago',
    },
    {
      id: 3,
      name: 'Security Audit',
      email: 'uid.restricted_77',
      role: 'System Admin',
      verification: 'Verification Pending',
      status: 'Flagge',
      region: 'Global Edge',
      lastActivity: '3 days ago',
    },
  ])

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Admin Dashboard" />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-container mx-auto space-y-8">
            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Platform Users', value: '12,482', change: '+12.4% from last month', icon: 'people' },
                { label: 'Verified Agents', value: '841', change: '98% KYC Completion', icon: 'verified_user' },
                { label: 'Active Listings', value: '3,204', change: 'Avg. Portfolio $1M', icon: 'home' },
                { label: 'Global Security Score', value: '99.2%', change: 'Optimal Session Health', icon: 'shield' },
              ].map((stat) => (
                <div key={stat.label} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-secondary">{stat.icon}</span>
                  </div>
                  <p className="text-on-surface-variant text-xs mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold mb-1">{stat.value}</p>
                  <p className="text-xs text-on-surface-variant">{stat.change}</p>
                </div>
              ))}
            </div>

            {/* User Management */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-headline-md font-semibold">User Management</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input-field h-10 text-sm"
                  />
                  <button className="btn-primary">+ Provision User</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left p-3 text-on-surface-variant">USER IDENTITY</th>
                      <th className="text-left p-3 text-on-surface-variant">ROLE</th>
                      <th className="text-left p-3 text-on-surface-variant">VERIFICATION</th>
                      <th className="text-left p-3 text-on-surface-variant">REGION</th>
                      <th className="text-left p-3 text-on-surface-variant">LAST ACTIVITY</th>
                      <th className="text-left p-3 text-on-surface-variant">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-outline-variant hover:bg-surface-container-high transition"
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-xs text-on-surface-variant">{user.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-secondary/20 text-secondary rounded text-xs">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant">{user.verification}</td>
                        <td className="p-3 text-on-surface-variant">{user.region}</td>
                        <td className="p-3 text-on-surface-variant">{user.lastActivity}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 ${
                            user.status === 'Active'
                              ? 'text-green-400'
                              : user.status === 'Flagged'
                              ? 'text-error'
                              : 'text-on-surface-variant'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center text-sm">
                <p className="text-on-surface-variant">Showing 1-3 of 12,482 entries</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 hover:bg-surface-container-high rounded">←</button>
                  <button className="px-3 py-1 bg-secondary/20 rounded">1</button>
                  <button className="px-3 py-1 hover:bg-surface-container-high rounded">→</button>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="card p-6">
              <h3 className="text-headline-md font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'New listing created', user: 'Julian De Marco', time: '5 mins ago' },
                  { action: 'User verified', user: 'Elena Kostic', time: '1 hour ago' },
                  { action: 'Security audit initiated', user: 'System', time: '3 hours ago' },
                  { action: 'Transaction completed', user: 'Marcus Sterling', time: 'Yesterday' },
                ].map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border-b border-outline-variant last:border-b-0">
                    <div>
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-xs text-on-surface-variant">{log.user}</p>
                    </div>
                    <p className="text-xs text-on-surface-variant">{log.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
