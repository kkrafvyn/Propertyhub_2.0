import React, { useState } from 'react'
import PropTechShell from '../../components/PropTechShell'
import { createTeamInvite, getTeamInvites } from '../../services/team-invite-service'
import { useAgencyStore } from '../../store/useAgencyStore'

const members = [
  ['Elena Rodriguez', 'elena.r@baytmiftah.com', 'Partner', '32 Active', '9.4', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'],
  ['Marcus Chen', 'm.chen@baytmiftah.com', 'Senior', '18 Active', '8.2', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80'],
  ['Sarah Miller', 'sarah.m@baytmiftah.com', 'Junior', '6 Active', '6.5', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'],
]

export default function TeamManagement() {
  const { currentAgency } = useAgencyStore()
  const [invites, setInvites] = useState(getTeamInvites)
  const [inviteNotice, setInviteNotice] = useState('')
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Agent',
    permissions: ['leads'],
  })

  const togglePermission = (permission) => {
    setInviteForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  const submitInvite = async (event) => {
    event.preventDefault()
    const { invite, source } = await createTeamInvite({
      ...inviteForm,
      agencyId: currentAgency?.id,
      organizationId: currentAgency?.id,
    })
    setInvites((current) => [invite, ...current])
    setInviteNotice(
      source === 'supabase'
        ? 'Invite stored in Supabase and ready for delivery.'
        : 'Invite saved locally. Supabase organization access or DB setup is required.'
    )
    setInviteForm({ email: '', role: 'Agent', permissions: ['leads'] })
  }

  return (
    <PropTechShell
      active="Agency"
      brand="BaytMiftah Agency"
      sidebarTitle="Global Realty"
      sidebarSubtitle="Enterprise Suite"
      searchPlaceholder="Search team..."
      primaryAction="+ Create"
    >
      <main className="px-5 py-10 md:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-5xl font-black">Team Management</h1>
              <p className="mt-3 text-xl text-[#303744]">
                Oversee agency performance and manage personnel permissions.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-bold uppercase tracking-widest text-[#8b929c]">Total Agents</p>
                <p className="text-4xl font-black">24</p>
              </div>
              <button className="min-h-11 rounded-md bg-[#E9C349] px-5 py-3 font-semibold text-[#071121] shadow-lg">
                <span className="material-symbols-outlined mr-2 align-middle">group_add</span>
                Invite Member
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['trending_up', 'Avg. Performance', '8.4 / 10', '+12%'],
              ['sell', 'Active Listings', '142', '+4'],
              ['schedule', 'Avg. Response Time', '18m', 'Today'],
              ['priority_high', 'Incomplete Profiles', '5', '2 Urgent'],
            ].map(([icon, label, value, tag], index) => (
              <article key={label} className="rounded-lg border border-[#cbd3df] bg-white p-8">
                <div className="flex justify-between">
                  <span
                    className={`material-symbols-outlined rounded-md p-4 text-3xl ${
                      index === 0 ? 'bg-[#F5D76B]' : index === 3 ? 'bg-red-100 text-red-700' : 'bg-[#dbeafe]'
                    }`}
                  >
                    {icon}
                  </span>
                  <span className={index === 3 ? 'font-bold text-red-600' : 'font-bold text-[#E9C349]'}>
                    {tag}
                  </span>
                </div>
                <p className="mt-8 text-lg text-[#303744]">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </article>
            ))}
          </div>

          <section className="mt-10 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <header className="flex items-center justify-between bg-[#edf4ff] p-8">
              <h2 className="text-xl font-bold">
                Agency Personnel
                <span className="ml-3 rounded bg-[#d8dde6] px-3 py-1 text-sm">Active</span>
              </h2>
              <div className="flex gap-3">
                <button className="rounded-md border border-[#9ba4b2] bg-white px-6 py-3 font-semibold">Filter</button>
                <button className="rounded-md border border-[#9ba4b2] bg-white px-6 py-3 font-semibold">Export</button>
              </div>
            </header>
            <div className="grid min-w-[900px] grid-cols-[1.5fr_1fr_0.8fr_1fr_0.6fr] px-8 py-4 font-semibold uppercase tracking-widest">
              <span>Agent</span>
              <span>Role</span>
              <span>Listings</span>
              <span>Score</span>
              <span>Action</span>
            </div>
            {members.map((member, index) => (
              <div key={member[1]} className="grid min-w-[900px] grid-cols-[1.5fr_1fr_0.8fr_1fr_0.6fr] items-center border-t border-[#d8dde6] px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-[#edf4ff] font-bold text-[#071121]">
                      {member[0]
                        .split(' ')
                        .map((name) => name[0])
                        .join('')}
                    </span>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border border-white ${index === 2 ? 'bg-[#cbd3df]' : 'bg-[#E9C349]'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{member[0]}</h3>
                    <p className="text-[#667085]">{member[1]}</p>
                  </div>
                </div>
                <span className={`w-fit rounded-full px-4 py-1 text-sm font-bold uppercase ${member[2] === 'Partner' ? 'bg-[#111827] text-white' : 'bg-[#dbeafe]'}`}>
                  {member[2]}
                </span>
                <span>{member[3]}</span>
                <span className="flex items-center gap-3">
                  <span className="h-2 w-32 rounded-full bg-[#cbd3df]">
                    <span
                      className={`block h-2 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-[#E9C349]'}`}
                      style={{ width: `${Number(member[4]) * 10}%` }}
                    />
                  </span>
                  <strong className={index === 2 ? 'text-orange-500' : 'text-[#E9C349]'}>{member[4]}</strong>
                </span>
                <span className="material-symbols-outlined">more_horiz</span>
              </div>
            ))}
            <footer className="flex items-center justify-between border-t border-[#d8dde6] p-6">
              <span>Showing 1-10 of 24 agents</span>
              <div className="flex gap-3">
                <button className="rounded border border-[#cbd3df] px-4 py-3 text-[#9ba4b2]" aria-label="Previous page">Prev</button>
                <button className="rounded border border-[#9ba4b2] px-4 py-3" aria-label="Next page">Next</button>
              </div>
            </footer>
          </section>

          <section className="mt-10 grid gap-7 rounded-lg border border-[#cbd3df] bg-white p-8 lg:grid-cols-[1fr_360px]">
            <form onSubmit={submitInvite} className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <h2 className="text-3xl font-bold">Invite and Permissions</h2>
                <p className="mt-2 text-[#303744]">
                  Send an invite with a role and clear module access.
                </p>
                {inviteNotice && (
                  <p className="mt-3 rounded-md bg-[#edf4ff] px-4 py-3 text-sm font-semibold text-[#303744]">
                    {inviteNotice}
                  </p>
                )}
              </div>
              <label>
                <span className="font-semibold">Email</span>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                  className="mt-2 h-12 w-full rounded border border-[#b9c3d2] px-4"
                />
              </label>
              <label>
                <span className="font-semibold">Role</span>
                <select
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((current) => ({ ...current, role: event.target.value }))
                  }
                  className="mt-2 h-12 w-full rounded border border-[#b9c3d2] px-4"
                >
                  <option>Agent</option>
                  <option>Senior Agent</option>
                  <option>Agency Admin</option>
                  <option>Viewer</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <p className="font-semibold">Permissions</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {['leads', 'listings', 'analytics', 'team', 'billing'].map((permission) => (
                    <button
                      type="button"
                      key={permission}
                      onClick={() => togglePermission(permission)}
                      className={`rounded-full px-4 py-2 font-semibold capitalize ${
                        inviteForm.permissions.includes(permission)
                          ? 'bg-black text-white'
                          : 'bg-[#edf4ff]'
                      }`}
                    >
                      {permission}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-fit rounded-md bg-black px-6 py-3 font-bold text-white">
                Send Invite
              </button>
            </form>

            <aside className="rounded-lg bg-[#edf4ff] p-5">
              <h3 className="font-bold">Pending invites</h3>
              <div className="mt-4 space-y-3">
                {invites.slice(0, 5).map((invite) => (
                  <div key={invite.id} className="rounded-md bg-white p-3">
                    <p className="font-semibold">{invite.email}</p>
                    <p className="text-sm text-[#596170]">
                      {invite.role} / {invite.permissions.join(', ')}
                    </p>
                  </div>
                ))}
                {invites.length === 0 && (
                  <p className="text-sm text-[#596170]">No active invites yet.</p>
                )}
              </div>
            </aside>
          </section>

          <div className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border border-[#cbd3df] bg-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Regional Performance Map</h2>
                  <p className="mt-1 text-lg text-[#303744]">
                    Agent density and listing distribution by sector.
                  </p>
                </div>
                <span className="material-symbols-outlined text-3xl">map</span>
              </div>
              <div className="relative mt-8 h-96 overflow-hidden rounded-lg bg-[#fff7d6]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(233,195,73,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(233,195,73,0.18)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute left-[18%] top-[28%] h-20 w-20 rounded-full border-4 border-[#E9C349] bg-white/70" />
                <div className="absolute right-[22%] top-[44%] h-28 w-28 rounded-full border-4 border-[#071121] bg-white/70" />
                <div className="absolute bottom-8 left-8 flex flex-wrap gap-5">
                  <span className="rounded-md bg-white px-8 py-4 font-bold shadow">North Sector: 12 Agents</span>
                  <span className="rounded-md bg-white px-8 py-4 font-bold shadow">West Sector: 8 Agents</span>
                </div>
              </div>
            </section>
            <aside className="space-y-7">
              <article className="rounded-lg bg-[#111827] p-8 text-white">
                <h2 className="text-2xl font-bold">Top Performer</h2>
                <div className="mt-7 flex items-center gap-4">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-[#F5D76B] font-bold text-[#071121] ring-4 ring-[#F5D76B]/40">
                    ER
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">Elena Rodriguez</h3>
                    <p>Partner Agent</p>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <span>Sales Volume</span>
                  <strong>$12.4M</strong>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/20">
                  <div className="h-2 w-[94%] rounded-full bg-[#F5D76B]" />
                </div>
                <button className="mt-8 w-full rounded-md bg-white py-4 font-bold text-black">
                  View Full Analytics
                </button>
              </article>
              <article className="rounded-lg border border-[#cbd3df] bg-white p-8">
                <h2 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#8b929c]">Active Invites</h2>
                {(invites.length > 0
                  ? invites
                  : [
                      { id: 'seed-1', email: 'j.dawson@email.com', status: 'Pending' },
                      { id: 'seed-2', email: 't.kim@agency.pro', status: 'Expiring' },
                    ]
                ).slice(0, 3).map((invite) => (
                  <div key={invite.id} className="mt-6 flex justify-between border-b border-[#d8dde6] pb-5 last:border-0">
                    <span>{invite.email}</span>
                    <span className={invite.status === 'Pending' || invite.status === 'pending' ? 'text-orange-500' : 'text-red-600'}>{invite.status}</span>
                  </div>
                ))}
              </article>
            </aside>
          </div>
        </section>
      </main>
    </PropTechShell>
  )
}

