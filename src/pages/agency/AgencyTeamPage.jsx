import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { fetchTeam, inviteTeamMember } from '../../services/agency-service'

function TeamPage() {
  const [team, setTeam] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'Agent' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchTeam().then(({ team: rows }) => setTeam(rows))
  }, [])

  async function handleInvite() {
    if (!form.email.trim()) return
    setLoading(true)
    setMessage('')
    const result = await inviteTeamMember(form)
    if (result?.member) setTeam((prev) => [...prev, result.member])
    setMessage(result?.ok !== false ? `Invitation sent to ${form.email}` : result?.error ?? 'Invite failed')
    setShowForm(false)
    setForm({ email: '', name: '', role: 'Agent' })
    setLoading(false)
  }

  return (
    <AgencyShell titleKey="hubs.agency.team.title" subtitleKey="hubs.agency.team.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

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
      <button type="button" onClick={() => setShowForm(true)} className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        Invite team member
      </button>

      {showForm && (
        <QuickFormModal title="Invite team member" onClose={() => setShowForm(false)} onSubmit={handleInvite} submitLabel="Send invite" loading={loading}>
          <ModalField label="Email">
            <input type="email" className={modalInputClassName()} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </ModalField>
          <ModalField label="Name (optional)">
            <input className={modalInputClassName()} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </ModalField>
          <ModalField label="Role">
            <select className={modalInputClassName()} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option>Agent</option>
              <option>Manager</option>
              <option>Admin</option>
            </select>
          </ModalField>
        </QuickFormModal>
      )}
    </AgencyShell>
  )
}

export default function AgencyTeamPage() {
  return <ProtectedRoute><TeamPage /></ProtectedRoute>
}
