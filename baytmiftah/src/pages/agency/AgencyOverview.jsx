import React from 'react'
import PropTechShell from '../../components/PropTechShell'

const funnel = [
  ['422', 'New'],
  ['184', 'Qualified'],
  ['96', 'Viewing'],
  ['52', 'Closing'],
]

export default function AgencyOverview() {
  return (
    <PropTechShell
      active="Dashboard"
      brand="PropFlow Agency"
      sidebarTitle="Global Realty"
      sidebarSubtitle="Enterprise Suite"
      searchPlaceholder="Global search..."
      primaryAction=""
    >
      <main className="px-5 py-10 md:px-10">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-5xl font-black">Agency Overview</h1>
              <p className="mt-3 text-2xl text-[#303744]">
                Real-time performance metrics and agency-wide operations.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="rounded-md border border-[#b9c3d2] bg-white px-8 py-4 font-bold">
                Download Report
              </button>
              <button className="rounded-md bg-black px-8 py-4 font-bold text-white">
                View Portfolio
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <article className="rounded-lg bg-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold uppercase tracking-widest">Total Sales (YTD)</p>
                  <p className="mt-4 text-6xl font-black">$142.8M</p>
                </div>
                <span className="rounded-full bg-[#62efad] px-4 py-2 font-bold text-[#006c48]">
                  ↗ +12.4%
                </span>
              </div>
              <div className="mt-12 flex h-40 items-end gap-2">
                {[42, 62, 56, 82, 100, 72, 88, 66].map((height, index) => (
                  <span
                    key={index}
                    className={`flex-1 ${index === 4 ? 'bg-black' : 'bg-[#cfe3ff]'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </article>

            <article className="rounded-lg border-2 border-black bg-white p-8">
              <p className="font-bold uppercase tracking-widest">Avg. Close Time</p>
              <p className="mt-5 text-5xl font-black">18 Days</p>
              <p className="mt-4 text-lg text-[#303744]">Faster than industry average by 4.2 days.</p>
              <div className="mt-8 rounded-md bg-[#dbeafe] p-5">
                <div className="flex justify-between font-bold">
                  <span>Efficiency Rating</span>
                  <span className="text-[#007a52]">Excellent</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#cbd3df]">
                  <div className="h-2 w-[88%] rounded-full bg-[#007a52]" />
                </div>
              </div>
            </article>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
            <section className="rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between border-b border-[#cbd3df] p-8">
                <h2 className="text-3xl font-bold">Active Lead Funnel</h2>
                <button className="flex items-center gap-2 font-bold">
                  Full Pipeline
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </header>
              <div className="p-8">
                <div className="grid gap-5 md:grid-cols-4">
                  {funnel.map(([value, label], index) => (
                    <div
                      key={label}
                      className={`rounded-md border border-[#d8dde6] p-6 text-center ${
                        index === 3 ? 'bg-[#62efad] text-[#006c48]' : 'bg-[#edf4ff]'
                      }`}
                    >
                      <p className="text-4xl font-black">{value}</p>
                      <p>{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-10 space-y-8">
                  {[
                    ['Sarah Jennings', 'Looking for: Waterfront Luxury Estates', '$4.2M Budget', 'High Intent'],
                    ['Mark Thompson', 'Looking for: Commercial Loft Space', '$1.8M Budget', 'Negotiation'],
                  ].map(([name, text, budget, status]) => (
                    <article key={name} className="flex items-center gap-5">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80"
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold">{name}</h3>
                        <p>{text}</p>
                      </div>
                      <div className="text-right">
                        <strong>{budget}</strong>
                        <p className="text-[#007a52]">{status}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#cbd3df] bg-white p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Team Health</h2>
                <span className="rounded bg-[#dbeafe] px-4 py-2 font-bold">Live Status</span>
              </div>
              <div className="mt-12 grid grid-cols-2 divide-x divide-[#d8dde6] text-center">
                <div>
                  <p className="mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-[#007a52] text-3xl font-bold">24</p>
                  <p className="mt-3 font-bold text-[#007a52]">Active</p>
                </div>
                <div>
                  <p className="mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-[#c7cad1] text-3xl font-bold">6</p>
                  <p className="mt-3">Idle</p>
                </div>
              </div>
              <div className="mt-10 space-y-5">
                {[
                  ['Marcus V.', 'On Viewing'],
                  ['Elena R.', 'Closing Meeting'],
                  ['David K.', 'Idle (15m)'],
                ].map(([name, status]) => (
                  <div key={name} className="flex justify-between border-b border-[#d8dde6] pb-4">
                    <span className="font-semibold">{name}</span>
                    <span>{status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-8 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <h2 className="p-8 text-3xl font-bold">Agency-Wide Activity</h2>
            <div className="grid min-w-[900px] grid-cols-[1.3fr_1fr_1.3fr_0.8fr_0.9fr] bg-[#edf4ff] px-8 py-5 font-semibold uppercase tracking-widest">
              <span>Activity</span>
              <span>Agent</span>
              <span>Entity</span>
              <span>Time</span>
              <span>Status</span>
            </div>
            {[
              ['check_circle', 'Agreement Signed', 'Marcus V.', 'Skyline Penthouse', '2 mins ago', 'Completed'],
              ['visibility', 'Property Tour Scheduled', 'Elena R.', 'Park Avenue 502', '15 mins ago', 'Scheduled'],
              ['warning', 'IoT Device Alert', 'System', 'Warehouse A (Flood Sensor)', '45 mins ago', 'Urgent'],
            ].map((row) => (
              <div key={row[1]} className="grid min-w-[900px] grid-cols-[1.3fr_1fr_1.3fr_0.8fr_0.9fr] border-t border-[#d8dde6] px-8 py-6 text-lg">
                <span className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${row[5] === 'Urgent' ? 'text-red-600' : 'text-[#007a52]'}`}>
                    {row[0]}
                  </span>
                  {row[1]}
                </span>
                <span>{row[2]}</span>
                <span>{row[3]}</span>
                <span>{row[4]}</span>
                <span
                  className={`w-fit rounded px-3 py-1 text-sm font-bold ${
                    row[5] === 'Urgent'
                      ? 'bg-red-100 text-red-700'
                      : row[5] === 'Scheduled'
                        ? 'bg-[#dbeafe]'
                        : 'bg-[#62efad] text-[#006c48]'
                  }`}
                >
                  {row[5]}
                </span>
              </div>
            ))}
          </section>
        </section>
      </main>
    </PropTechShell>
  )
}
