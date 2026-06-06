import React from 'react'
import PropTechShell from '../../components/PropTechShell'

const members = [
  ['Elena Rodriguez', 'elena.r@propflow.com', 'Partner', '32 Active', '9.4', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'],
  ['Marcus Chen', 'm.chen@propflow.com', 'Senior', '18 Active', '8.2', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80'],
  ['Sarah Miller', 'sarah.m@propflow.com', 'Junior', '6 Active', '6.5', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'],
]

export default function TeamManagement() {
  return (
    <PropTechShell
      active="Agency"
      brand="PropFlow Agency"
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
              <button className="rounded-md bg-[#007a52] px-8 py-4 text-xl font-bold text-white shadow-lg">
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
                      index === 0 ? 'bg-[#62efad]' : index === 3 ? 'bg-red-100 text-red-700' : 'bg-[#dbeafe]'
                    }`}
                  >
                    {icon}
                  </span>
                  <span className={index === 3 ? 'font-bold text-red-600' : 'font-bold text-[#007a52]'}>
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
                    <img src={member[5]} alt="" className="h-14 w-14 rounded-full object-cover" />
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border border-white ${index === 2 ? 'bg-[#cbd3df]' : 'bg-[#007a52]'}`} />
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
                      className={`block h-2 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-[#007a52]'}`}
                      style={{ width: `${Number(member[4]) * 10}%` }}
                    />
                  </span>
                  <strong className={index === 2 ? 'text-orange-500' : 'text-[#007a52]'}>{member[4]}</strong>
                </span>
                <span className="material-symbols-outlined">more_horiz</span>
              </div>
            ))}
            <footer className="flex items-center justify-between border-t border-[#d8dde6] p-6">
              <span>Showing 1-10 of 24 agents</span>
              <div className="flex gap-3">
                <button className="rounded border border-[#cbd3df] px-4 py-3 text-[#9ba4b2]">‹</button>
                <button className="rounded border border-[#9ba4b2] px-4 py-3">›</button>
              </div>
            </footer>
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
              <div className="relative mt-8 overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=85"
                  alt=""
                  className="h-96 w-full object-cover opacity-45"
                />
                <div className="absolute inset-0 bg-[#dffbf0]/40" />
                <div className="absolute bottom-8 left-8 flex flex-wrap gap-5">
                  <span className="rounded-md bg-white px-8 py-4 font-bold shadow">● North Sector: 12 Agents</span>
                  <span className="rounded-md bg-white px-8 py-4 font-bold shadow">● West Sector: 8 Agents</span>
                </div>
              </div>
            </section>
            <aside className="space-y-7">
              <article className="rounded-lg bg-[#111827] p-8 text-white">
                <h2 className="text-2xl font-bold">Top Performer</h2>
                <div className="mt-7 flex items-center gap-4">
                  <img src={members[0][5]} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-[#62efad]" />
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
                  <div className="h-2 w-[94%] rounded-full bg-[#62efad]" />
                </div>
                <button className="mt-8 w-full rounded-md bg-white py-4 font-bold text-black">
                  View Full Analytics
                </button>
              </article>
              <article className="rounded-lg border border-[#cbd3df] bg-white p-8">
                <h2 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#8b929c]">Active Invites</h2>
                {[
                  ['j.dawson@email.com', 'Pending'],
                  ['t.kim@agency.pro', 'Expiring'],
                ].map(([email, status]) => (
                  <div key={email} className="mt-6 flex justify-between border-b border-[#d8dde6] pb-5 last:border-0">
                    <span>{email}</span>
                    <span className={status === 'Pending' ? 'text-orange-500' : 'text-red-600'}>{status}</span>
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
