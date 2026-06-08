import React, { useMemo, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

const platformUsers = [
  {
    id: 1,
    name: 'Julian De Marco',
    email: 'uid.992834371',
    role: 'Elite Agent',
    verification: 'Tier 3 Ultra',
    status: 'Active',
    region: 'New York, NY',
    lastActivity: '2 mins ago',
  },
  {
    id: 2,
    name: 'Elena Kostic',
    email: 'uid.10234847',
    role: 'Buyer',
    verification: 'Tier 1 Basic',
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
    status: 'Flagged',
    region: 'Global Edge',
    lastActivity: '3 days ago',
  },
]

const stats = [
  { label: 'Total Platform Users', value: '12,482', change: '+12.4% from last month', icon: 'people' },
  { label: 'Verified Agents', value: '841', change: '98% KYC completion', icon: 'verified_user' },
  { label: 'Active Listings', value: '3,204', change: 'Average portfolio $1M', icon: 'home' },
  { label: 'Global Security Score', value: '99.2%', change: 'Optimal session health', icon: 'shield' },
]

const activity = [
  { action: 'New listing created', user: 'Julian De Marco', time: '5 mins ago', icon: 'add_home' },
  { action: 'User verified', user: 'Elena Kostic', time: '1 hour ago', icon: 'how_to_reg' },
  { action: 'Security audit initiated', user: 'System', time: '3 hours ago', icon: 'policy' },
  { action: 'Transaction completed', user: 'Marcus Sterling', time: 'Yesterday', icon: 'payments' },
]

export default function AdminDashboard() {
  const [query, setQuery] = useState('')

  const users = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return platformUsers
    return platformUsers.filter((user) =>
      [user.name, user.email, user.role, user.region, user.status].some((value) =>
        value.toLowerCase().includes(needle)
      )
    )
  }, [query])

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      <main className="pb-32 md:ml-64 md:pb-8">
        <Header title="Admin Dashboard" />

        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="card p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="material-symbols-outlined text-secondary">{stat.icon}</span>
                  </div>
                  <p className="mb-1 text-xs text-on-surface-variant">{stat.label}</p>
                  <p className="mb-1 text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-on-surface-variant">{stat.change}</p>
                </div>
              ))}
            </div>

            <div className="card p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-headline-md font-semibold">User Management</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Search identities, roles, verification state, and regional activity.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search users..."
                    className="input-field h-10 text-sm"
                  />
                  <button className="btn-primary">Provision User</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="p-3 text-left text-on-surface-variant">USER IDENTITY</th>
                      <th className="p-3 text-left text-on-surface-variant">ROLE</th>
                      <th className="p-3 text-left text-on-surface-variant">VERIFICATION</th>
                      <th className="p-3 text-left text-on-surface-variant">REGION</th>
                      <th className="p-3 text-left text-on-surface-variant">LAST ACTIVITY</th>
                      <th className="p-3 text-left text-on-surface-variant">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-outline-variant transition hover:bg-surface-container-high"
                      >
                        <td className="p-3">
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-xs text-on-surface-variant">{user.email}</p>
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-secondary/20 px-2 py-1 text-xs text-secondary">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant">{user.verification}</td>
                        <td className="p-3 text-on-surface-variant">{user.region}</td>
                        <td className="p-3 text-on-surface-variant">{user.lastActivity}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              user.status === 'Active'
                                ? 'text-green-400'
                                : user.status === 'Flagged'
                                  ? 'text-error'
                                  : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <p className="text-on-surface-variant">
                  Showing {users.length} of {platformUsers.length} preview entries
                </p>
                <div className="flex gap-2">
                  <button className="rounded px-3 py-1 hover:bg-surface-container-high">Prev</button>
                  <button className="rounded bg-secondary/20 px-3 py-1">1</button>
                  <button className="rounded px-3 py-1 hover:bg-surface-container-high">Next</button>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="mb-4 text-headline-md font-semibold">Recent Activity</h3>
              <div className="space-y-3">
                {activity.map((log) => (
                  <div
                    key={`${log.action}-${log.time}`}
                    className="flex items-center justify-between border-b border-outline-variant p-3 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary">{log.icon}</span>
                      <div>
                        <p className="font-semibold">{log.action}</p>
                        <p className="text-xs text-on-surface-variant">{log.user}</p>
                      </div>
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
