import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchTeam } from '../../services/agency-service'

function TeamPage() {
  const [team, setTeam] = useState([])

  useEffect(() => {
    fetchTeam().then(({ team: rows }) => setTeam(rows))
  }, [])

  return (
    <AgencyShell title="Team" subtitle="Manage agents and permissions">
      <div className="overflow-hidden rounded-card border border-surface-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3">{member.name}</td>
                <td className="px-4 py-3">{member.role}</td>
                <td className="px-4 py-3 text-ink-secondary">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                    {member.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-4 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
        Invite team member
      </button>
    </AgencyShell>
  )
}

export default function AgencyTeamPage() {
  return <ProtectedRoute><TeamPage /></ProtectedRoute>
}
