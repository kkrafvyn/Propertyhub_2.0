import React from 'react'
import PropTechShell from '../../components/PropTechShell'

const bars = [36, 48, 66, 55, 78, 92, 61, 72]
const agents = [
  ['Jordan Miller', '14', '$1,240,000', '62%', '$37,200'],
  ['Sarah Chen', '22', '$2,890,000', '48%', '$86,700'],
  ['Raj Patel', '9', '$840,500', '82%', '$25,215'],
]

export default function Analytics() {
  return (
    <PropTechShell active="Analytics" searchPlaceholder="Search analytics..." primaryAction="Create">
      <main className="px-5 py-10 md:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-5xl font-black leading-tight md:text-7xl">Performance Insights</h1>
              <p className="mt-3 text-xl text-[#303744]">
                Portfolio: Skyreach International Hub & 12 Assets
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase tracking-widest text-[#007a52]">Live Status</p>
              <p className="text-xl">● Active Monitoring</p>
            </div>
          </div>

          <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
            <article className="rounded-lg border border-[#cbd3df] bg-white p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Historical Rental Income</h2>
                <div className="flex gap-2">
                  {['6M', '1Y', 'ALL'].map((tab, index) => (
                    <button
                      key={tab}
                      className={`rounded px-3 py-2 font-semibold ${
                        index === 1 ? 'bg-black text-white' : 'bg-[#dbeafe]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-8 flex h-80 items-end justify-around rounded-lg bg-[#edf4ff] px-8 py-8">
                {bars.map((height, index) => (
                  <div
                    key={index}
                    className={`w-10 rounded-t ${index === 5 ? 'bg-gradient-to-b from-black to-[#d6dde8]' : 'bg-gradient-to-b from-[#62efad] to-[#eaf6ff]'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <footer className="mt-6 flex items-center justify-between text-lg font-bold">
                <span>● $1.2M Total Realized</span>
                <span className="text-[#007a52]">+12.4% vs LY</span>
              </footer>
            </article>

            <div className="space-y-7">
              <article className="rounded-lg border border-[#cbd3df] bg-white p-8">
                <div className="flex justify-between">
                  <p className="text-lg">Conversion Rate</p>
                  <span className="material-symbols-outlined text-[#007a52]">trending_up</span>
                </div>
                <p className="mt-3 text-5xl font-black">4.82%</p>
                <p className="mt-2 text-lg text-[#007a52]">+0.4% this month</p>
              </article>
              <article className="rounded-lg border border-[#cbd3df] bg-white p-8">
                <div className="flex justify-between">
                  <p className="text-lg">Avg. Time to Close</p>
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <p className="mt-3 text-5xl font-black">18 Days</p>
                <p className="mt-2 text-lg text-red-600">Down from 22 days</p>
              </article>
            </div>
          </div>

          <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between p-8">
                <h2 className="text-3xl font-bold">Active Leads & Tracking</h2>
                <button className="font-semibold">
                  <span className="material-symbols-outlined mr-2 align-middle">filter_list</span>
                  Filter Leads
                </button>
              </header>
              <div className="grid min-w-[820px] grid-cols-[1.3fr_1fr_1fr_1fr_0.7fr] bg-[#edf4ff] px-8 py-5 text-sm font-bold uppercase tracking-widest">
                <span>Lead Name</span>
                <span>Inquiry Type</span>
                <span>Property</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {[
                ['JS', 'Julian Sterling', 'High Intent', '3 Bedroom Suite', 'Skyreach Hub', 'Reviewing'],
                ['MK', 'Mila Kovic', 'Tour Requested', 'Commercial Loft', 'The Foundry', 'New'],
                ['RT', 'Robert Tuan', 'Verified Buyer', 'Penthouse A', 'Azure Heights', 'Urgent'],
              ].map((lead) => (
                <div key={lead[1]} className="grid min-w-[820px] grid-cols-[1.3fr_1fr_1fr_1fr_0.7fr] items-center border-t border-[#d8dde6] px-8 py-7">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dbeafe] font-bold">
                      {lead[0]}
                    </span>
                    <div>
                      <p className="text-xl font-bold">{lead[1]}</p>
                      <p className="text-[#596170]">{lead[2]}</p>
                    </div>
                  </div>
                  <span>{lead[3]}</span>
                  <span>{lead[4]}</span>
                  <span
                    className={`w-fit rounded-full px-4 py-2 font-semibold ${
                      lead[5] === 'Urgent'
                        ? 'bg-red-100 text-red-700'
                        : lead[5] === 'New'
                          ? 'bg-[#dbeafe]'
                          : 'bg-[#62efad] text-[#006c48]'
                    }`}
                  >
                    {lead[5]}
                  </span>
                  <span className="material-symbols-outlined">more_horiz</span>
                </div>
              ))}
            </section>

            <aside className="space-y-7">
              <article className="rounded-lg border border-[#007a52] bg-[#eefcf8] p-8">
                <h2 className="flex items-center gap-4 text-3xl font-bold">
                  <span className="material-symbols-outlined text-[#007a52]">rocket_launch</span>
                  Marketing Boost
                </h2>
                <p className="mt-7 text-lg leading-7 text-[#303744]">
                  Increase listing visibility by 250% with our AI-powered placement engine.
                </p>
                {[
                  ['Featured Listing', 'Top of search results', true],
                  ['Email Retargeting', 'Notify saved-search users', false],
                ].map(([title, body, enabled]) => (
                  <div key={title} className="mt-5 flex items-center justify-between rounded-md bg-white/70 p-5">
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className="text-[#596170]">{body}</p>
                    </div>
                    <span className={`h-8 w-14 rounded-full ${enabled ? 'bg-[#007a52]' : 'bg-[#cbd3df]'}`} />
                  </div>
                ))}
                <div className="mt-8">
                  <div className="mb-2 flex justify-between font-semibold uppercase tracking-widest text-[#596170]">
                    <span>Campaign Credits</span>
                    <span>850 / 1000</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#cbd3df]">
                    <div className="h-2 w-[85%] rounded-full bg-[#007a52]" />
                  </div>
                </div>
                <button className="mt-8 w-full rounded-lg border-2 border-[#007a52] py-5 text-xl font-bold text-[#007a52]">
                  Manage Placements
                </button>
              </article>

              <article className="rounded-lg bg-[#1d334a] p-8 text-white shadow-xl">
                <p className="font-bold uppercase tracking-widest text-white/35">Inquiries vs. Views</p>
                <p className="mt-6 text-6xl font-black">2.4k <span className="text-xl text-[#62efad]">↑18%</span></p>
                <div className="mt-10 flex h-28 items-end gap-3">
                  {[20, 36, 55, 46, 72, 90].map((height) => (
                    <span
                      key={height}
                      className="flex-1 rounded-t bg-[#007a52]"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </article>
            </aside>
          </div>

          <section className="mt-8 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <header className="flex items-center justify-between p-8">
              <h2 className="font-bold uppercase tracking-widest">Historical Listing Performance</h2>
              <span>● Luxury &nbsp;&nbsp; ● Residential</span>
            </header>
            <div className="relative h-96 border-t border-[#d8dde6] p-8">
              <svg viewBox="0 0 1000 260" className="h-full w-full" preserveAspectRatio="none">
                {[40, 90, 140, 190, 240].map((y) => (
                  <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#dbeafe" />
                ))}
                <polyline
                  points="0,220 100,210 200,180 300,195 400,130 500,145 600,80 700,105 800,70 900,95 1000,45"
                  fill="none"
                  stroke="#000"
                  strokeWidth="3"
                />
                <polyline
                  points="0,245 100,230 200,220 300,225 400,180 500,195 600,170 700,180 800,150 900,155 1000,130"
                  fill="none"
                  stroke="#6b7280"
                  strokeDasharray="6 4"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <div className="grid min-w-[900px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr] bg-[#edf4ff] px-8 py-5 font-semibold uppercase tracking-widest">
              <span>Agent</span>
              <span>Active Listings</span>
              <span>Sales Volume</span>
              <span>Conversion</span>
              <span>Commission</span>
            </div>
            {agents.map((row) => (
              <div key={row[0]} className="grid min-w-[900px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center border-t border-[#d8dde6] px-8 py-6 text-xl">
                <span className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dbeafe] font-bold">
                    {row[0].split(' ').map((name) => name[0]).join('')}
                  </span>
                  {row[0]}
                </span>
                <span>{row[1]}</span>
                <span>{row[2]}</span>
                <span>
                  <span className="inline-block h-2 w-32 rounded-full bg-[#edf4ff] align-middle">
                    <span className="block h-2 rounded-full bg-[#007a52]" style={{ width: row[3] }} />
                  </span>
                </span>
                <strong className="text-[#007a52]">{row[4]}</strong>
              </div>
            ))}
          </section>
        </section>
      </main>
    </PropTechShell>
  )
}
