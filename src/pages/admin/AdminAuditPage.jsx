import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAdminOverview } from '../../services/admin-service'

export default function AdminAuditPage() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchAdminOverview().then((d) => setEvents(d.auditEvents))
  }, [])

  return (
    <ProtectedRoute>
      <AdminShell title="Audit log" subtitle="Platform activity trail">
        <div className="overflow-hidden rounded-card border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{event.action}</td>
                  <td className="px-4 py-3 text-white/70">{event.actor}</td>
                  <td className="px-4 py-3">{event.target}</td>
                  <td className="px-4 py-3 text-white/70">{new Date(event.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </ProtectedRoute>
  )
}
