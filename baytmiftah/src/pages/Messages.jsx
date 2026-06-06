import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import EnterpriseShell from '../components/EnterpriseShell'

const conversations = [
  {
    id: 1,
    name: 'Elena Rodriguez',
    message: 'The occupancy sensors are showing activity in the guest wing too.',
    time: '2m ago',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80',
    online: true,
  },
  {
    id: 2,
    name: 'Marcus Chen',
    message: 'Maintenance scheduled for 3 PM tomorrow.',
    time: '1h ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 3,
    name: 'Sarah Jenkins',
    message: 'Drafted the penthouse lease and marked the closing notes.',
    time: '4h ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    unread: true,
  },
  {
    id: 4,
    name: 'Jordan Dane',
    message: 'Please review the Q4 analytics export.',
    time: 'Yesterday',
    initials: 'JD',
  },
]

export default function Messages() {
  const [selected, setSelected] = useState(conversations[0])

  return (
    <EnterpriseShell activeSection="Agency" searchPlaceholder="Search conversations..." showCreate={false}>
      <main className="grid min-h-[calc(100vh-5rem)] bg-[#f5f7fc] lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)_360px]">
        <aside className="border-r border-[#cbd3df] bg-[#f7f9fd]">
          <div className="border-b border-[#cbd3df] p-8">
            <h1 className="text-4xl font-bold">Messages</h1>
            <label className="mt-7 flex h-14 items-center gap-3 rounded-md bg-[#dfeaff] px-5">
              <span className="material-symbols-outlined text-[#303744]">search</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-[#667085]"
                placeholder="Search conversations..."
              />
            </label>
          </div>

          <div className="divide-y divide-[#d8dde6]">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelected(conversation)}
                className={`flex w-full items-center gap-4 px-8 py-6 text-left transition ${
                  selected.id === conversation.id
                    ? 'border-l-4 border-[#007a52] bg-[#dbeafe]'
                    : 'hover:bg-white'
                }`}
              >
                {conversation.avatar ? (
                  <div className="relative shrink-0">
                    <img
                      src={conversation.avatar}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    {conversation.online && (
                      <span className="absolute bottom-1 right-0 h-4 w-4 rounded-full border-2 border-white bg-[#007a52]" />
                    )}
                  </div>
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#dbeafe] text-xl font-bold">
                    {conversation.initials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate text-xl font-bold">{conversation.name}</h2>
                    <span className="shrink-0 text-sm text-[#4b5563]">{conversation.time}</span>
                  </div>
                  <p
                    className={`mt-1 truncate text-lg ${
                      selected.id === conversation.id ? 'text-[#007a52]' : 'text-[#303744]'
                    }`}
                  >
                    {conversation.message}
                  </p>
                </div>
                {conversation.unread && <span className="h-2 w-2 rounded-full bg-[#007a52]" />}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col border-r border-[#cbd3df]">
          <header className="flex h-24 items-center justify-between border-b border-[#cbd3df] bg-[#f8faff] px-8">
            <div className="flex items-center gap-4">
              {selected.avatar ? (
                <img src={selected.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#dbeafe] font-bold">
                  {selected.initials}
                </span>
              )}
              <div>
                <h2 className="text-2xl font-bold">{selected.name}</h2>
                <p className="font-semibold uppercase tracking-widest text-[#007a52]">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-7">
              <span className="material-symbols-outlined text-3xl">call</span>
              <span className="material-symbols-outlined text-3xl">videocam</span>
              <span className="h-10 border-l border-[#9ba4b2]" />
              <span className="material-symbols-outlined text-3xl">more_vert</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-10 py-8">
            <div className="mx-auto w-fit rounded-full bg-[#dbeafe] px-8 py-2 font-semibold uppercase tracking-widest text-[#4b5563]">
              Today
            </div>
            <div className="mt-10 space-y-10">
              <div>
                <div className="max-w-md rounded-lg border border-[#d8dde6] bg-white p-6 text-2xl leading-relaxed shadow-sm">
                  Good morning! I&apos;m reviewing the live data for the Skyview Penthouse.
                  Have you seen the recent HVAC spikes in the master suite?
                </div>
                <p className="mt-2 text-sm text-[#4b5563]">09:42 AM</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="max-w-lg rounded-lg bg-black p-7 text-right text-2xl leading-relaxed text-white shadow-lg">
                  Checking now. It might be the solar gain from the west-facing windows.
                  The smart tinting should have kicked in at 2 PM yesterday.
                </div>
                <p className="mt-2 text-sm text-[#4b5563]">
                  09:45 AM <span className="text-[#007a52]">✓✓</span>
                </p>
              </div>
              <div>
                <div className="max-w-md rounded-lg border border-[#d8dde6] bg-white p-6 text-2xl leading-relaxed shadow-sm">
                  The occupancy sensors are showing activity in the guest wing too. We
                  should confirm if the staging crew is still on-site.
                </div>
                <p className="mt-2 text-sm text-[#4b5563]">09:47 AM</p>
              </div>
            </div>
          </div>

          <footer className="border-t border-[#cbd3df] bg-[#f8faff] p-8">
            <div className="flex items-center gap-4 rounded-lg bg-[#dfeaff] p-4">
              <span className="material-symbols-outlined text-3xl">add_circle</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-[#667085]"
                placeholder="Type your message..."
              />
              <span className="material-symbols-outlined text-3xl">sentiment_satisfied</span>
              <button className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-black text-white">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </footer>
        </section>

        <aside className="hidden overflow-y-auto bg-[#f7f9fd] p-8 xl:block">
          <p className="text-sm font-semibold uppercase tracking-[0.32em]">Active Context</p>
          <article className="mt-8 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=600&q=85"
                alt=""
                className="h-48 w-full object-cover"
              />
              <span className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-bold">
                $4,500,000
              </span>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold">Skyview Penthouse</h2>
              <p className="mt-1 flex items-center gap-1 text-[#303744]">
                <span className="material-symbols-outlined text-base">location_on</span>
                Upper East Side, NY
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ['Temp', '72°F'],
                  ['Occupancy', 'High'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-[#dbeafe] p-4">
                    <p className="text-xs font-semibold uppercase">{label}</p>
                    <p className="mt-3 text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/smart-property/devices"
                className="mt-6 flex items-center justify-center gap-2 rounded-md border border-[#9ba4b2] py-4 font-semibold"
              >
                Full Dashboard
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </article>

          <section className="mt-10">
            <h3 className="font-semibold uppercase tracking-widest">24h Activity</h3>
            <div className="mt-8 flex h-24 items-end gap-3">
              {[22, 34, 60, 46, 78, 66, 32].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t bg-[#d9e6ea]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h3 className="font-semibold uppercase tracking-widest">Recent Documents</h3>
            <div className="mt-6 space-y-5">
              {[
                ['description', 'Lease_Draft_v2.pdf'],
                ['image', 'HVAC_Logs_July.jpg'],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="material-symbols-outlined">{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </EnterpriseShell>
  )
}
