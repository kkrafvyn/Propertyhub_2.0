import React from 'react'
import EnterpriseShell from '../components/EnterpriseShell'

const actions = [
  {
    title: 'Contemporary Glass Villa',
    status: 'Confirmed',
    statusClass: 'bg-[#62efad] text-[#007a52]',
    meta: ['Oct 24, 2023', '14:00 - 15:00', 'Beverly Hills, CA'],
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=85',
    footer: 'Agent: Marcus Thorne',
    action: 'View Details',
  },
  {
    title: 'Industrial Penthouse',
    status: 'Pending Approval',
    statusClass: 'bg-[#dbeafe] text-[#303744]',
    meta: ['Oct 28, 2023', 'Rental Inquiry'],
    image:
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=85',
    footer: '"Waiting for owner to confirm the requested morning slot."',
    action: 'Property Page',
  },
]

export default function Bookings() {
  return (
    <EnterpriseShell activeSection="Settings" searchPlaceholder="Search bookings..." showCreate={false}>
      <main className="bg-[#f5f7fc] px-5 py-10 text-[#071121] md:px-10">
        <section className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black leading-tight md:text-5xl">My Bookings & History</h1>
          <p className="mt-3 text-xl text-[#303744]">
            Manage your viewing schedule, active rental agreements, and purchase offers.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {['All Items', 'Upcoming', 'Past Transactions', 'Purchase Inquiries'].map((tab, index) => (
              <button
                key={tab}
                className={`rounded-full px-7 py-3 text-lg ${
                  index === 0 ? 'bg-black text-white' : 'bg-[#dbeafe] text-[#071121]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-9 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="relative overflow-hidden rounded-lg bg-[#111827] p-8 text-white">
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center rounded-full bg-[#174d4b] px-4 py-2 text-lg text-[#62efad]">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#62efad]" />
                  Live Now
                </span>
                <h2 className="mt-7 text-3xl font-bold">Scheduled Viewing: Skyline Loft</h2>
                <p className="mt-5 max-w-lg text-xl leading-8 text-[#8f9aad]">
                  Agent Marcus is waiting for you at the entrance of 42nd Avenue. Please
                  arrive within the next 15 minutes.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button className="rounded-md bg-[#007a52] px-8 py-4 font-bold text-white">
                    Get Directions
                  </button>
                  <button className="rounded-md border border-white/20 px-8 py-4 font-bold text-white">
                    Contact Agent
                  </button>
                </div>
              </div>
              <div className="absolute right-8 top-10 h-56 w-56 rotate-12 rounded-[32px] border border-white/10" />
              <div className="absolute right-20 top-14 h-56 w-56 -rotate-12 rounded-[32px] border border-white/10" />
            </article>

            <aside className="rounded-lg border border-[#b7c7de] bg-[#cfe3ff] p-8">
              {[
                ['Active Inquiries', '04'],
                ['Confirmed Viewings', '02'],
                ['Completed Leases', '12'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-[#b7c7de] py-6 text-lg last:border-b-0"
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </aside>
          </div>

          <h2 className="mt-10 text-3xl font-bold">Upcoming Viewings & Actions</h2>
          <div className="mt-6 space-y-5">
            {actions.map((item) => (
              <article
                key={item.title}
                className="grid overflow-hidden rounded-lg border border-[#cbd3df] bg-white md:grid-cols-[300px_minmax(0,1fr)]"
              >
                <img src={item.image} alt="" className="h-64 w-full object-cover md:h-full" />
                <div className="p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-3xl font-bold">{item.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-lg text-[#303744]">
                        {item.meta.map((meta, index) => (
                          <span key={meta} className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              {index === 0 ? 'calendar_month' : index === 1 ? 'schedule' : 'location_on'}
                            </span>
                            {meta}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`w-fit shrink-0 rounded-full px-5 py-2 text-base ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-16 flex flex-col gap-4 border-t border-[#cbd3df] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg text-[#303744]">{item.footer}</span>
                    <button className="flex items-center gap-2 text-lg">
                      {item.action}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-12">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-3xl font-bold">Transaction History</h2>
              <button className="flex items-center gap-2 font-semibold text-[#007a52]">
                Download CSV
                <span className="material-symbols-outlined text-base">download</span>
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#cbd3df] bg-white">
              <table className="min-w-[760px] w-full text-left">
                <thead className="bg-[#edf4ff]">
                  <tr>
                    {['Property', 'Date', 'Transaction Type', 'Status', 'Action'].map((heading) => (
                      <th key={heading} className="px-5 py-4 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Oakwood Estate', 'Unit 402, Building B', 'Sep 12, 2023', 'Purchase Inquiry', 'Completed'],
                    ['Hilltop Sanctuary', 'Main Residence', 'Aug 05, 2023', 'Rental Lease', 'Expired'],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-[#d8dde6]">
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=140&q=80"
                            alt=""
                            className="h-12 w-16 rounded object-cover"
                          />
                          <div>
                            <p className="font-semibold">{row[0]}</p>
                            <p className="text-sm text-[#4b5563]">{row[1]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">{row[2]}</td>
                      <td className="px-5 py-5">{row[3]}</td>
                      <td className="px-5 py-5">
                        <span
                          className={`rounded px-3 py-1 text-xs font-semibold uppercase ${
                            row[4] === 'Completed'
                              ? 'bg-[#dbeafe] text-[#303744]'
                              : 'bg-[#fecaca] text-red-700'
                          }`}
                        >
                          {row[4]}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <span className="material-symbols-outlined">more_vert</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </EnterpriseShell>
  )
}
