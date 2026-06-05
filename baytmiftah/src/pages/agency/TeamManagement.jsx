import { useEffect, useState } from 'react'
import { useAgencyStore } from '../../store/useAgencyStore'
import agencyService from '../../services/agency-service'

export default function TeamManagement() {
  const { currentAgency, teamMembers, fetchTeamMembers, addTeamMember, removeTeamMember } = useAgencyStore()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', role: 'agent' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentAgency?.id) {
      fetchTeamMembers(currentAgency.id)
    }
  }, [currentAgency?.id])

  const handleInvite = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addTeamMember(currentAgency.id, inviteData)
      setInviteData({ email: '', role: 'agent' })
      setShowInviteForm(false)
    } catch (error) {
      console.error('Error inviting member:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-md font-bold">Team Members</h1>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          + Invite Member
        </button>
      </div>

      {showInviteForm && (
        <form onSubmit={handleInvite} className="bg-surface-container rounded-lg p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-body-md font-medium mb-2">Email</label>
              <input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="agent@example.com"
                className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-body-md font-medium mb-2">Role</label>
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Team Members List */}
      <div className="bg-surface-container rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-surface">
                <th className="px-6 py-3 text-left text-body-md font-medium">Name</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Email</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Role</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Status</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-gray-700 hover:bg-surface transition">
                  <td className="px-6 py-3">{member.user?.display_name || 'N/A'}</td>
                  <td className="px-6 py-3">{member.user?.email || member.email}</td>
                  <td className="px-6 py-3">
                    <span className="px-3 py-1 bg-gray-700 rounded-full text-body-sm capitalize">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-body-sm capitalize ${
                        member.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => removeTeamMember(member.id)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      Remove
                    </button>
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
