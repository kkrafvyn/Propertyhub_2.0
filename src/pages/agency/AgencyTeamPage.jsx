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
    <AgencyShell titleKey="hubs.agency.team.title" subtitleKey="hubs.agency.team.subtitle">
      <div className="overflow-hidden panel-card bg-surface">
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
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-ink">
                    {member.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        Invite team member
      </button>
    </AgencyShell>
  )
}

export default function AgencyTeamPage() {
  return <ProtectedRoute><TeamPage /></ProtectedRoute>
}
