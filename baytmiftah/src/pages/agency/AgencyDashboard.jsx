import React from 'react'
import PropTechShell from '../../components/PropTechShell'

const healthItems = [
  ['apartment', 'The Zenith Tower', '142 Active Sensors', 'Optimal'],
  ['domain', 'Silicon Plaza HQ', '88 Active Sensors', 'HVAC Alert'],
  ['home', 'Riverview Lofts', '210 Active Sensors', 'Optimal'],
  ['villa', 'Apex Industrial', 'Offline / Under Dev', 'Standby'],
]

export default function AgencyDashboard() {
  return (
    <PropTechShell active="Dashboard" searchPlaceholder="Search portfolio...">
      <main className="px-5 py-10 md:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-5xl font-black leading-tight md:text-7xl">Portfolio Overview</h1>
              <p className="mt-4 max-w-4xl text-2xl leading-9 text-[#303744]">
                Welcome back, Managing Principal. Your assets are performing 4.2% above
                market average.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-md border border-[#b9c3d2] bg-white px-7 py-4 font-bold">
                <span className="material-symbols-outlined mr-2 align-middle">download</span>
                Export Report
              </button>
              <button className="rounded-md bg-black px-7 py-4 font-bold text-white">
                <span className="material-symbols-outlined mr-2 align-middle">calendar_month</span>
                Schedule Maintenance
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-7 lg:grid-cols-3">
            {[
              ['account_balance', 'Total Portfolio Value', '$42,850,000', '+12.5% ↗'],
              ['payments', 'Monthly Rental Income', '$318,420', '+3.2% ↗'],
              ['real_estate_agent', 'Portfolio Occupancy', '96.8%', 'Stable'],
            ].map(([icon, label, value, tag]) => (
              <article key={label} className="rounded-lg border border-[#d8dde6] bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined rounded-md bg-[#dbeafe] p-4 text-3xl">
                    {icon}
                  </span>
                  <span className="rounded-full bg-[#62efad] px-4 py-1 font-semibold text-[#006c48]">
                    {tag}
                  </span>
                </div>
                <p className="mt-14 text-2xl text-[#303744]">{label}</p>
                <p className="mt-3 text-5xl font-black">{value}</p>
                {label === 'Portfolio Occupancy' && (
                  <div className="mt-8 h-2 rounded-full bg-[#cbd3df]">
                    <div className="h-2 w-[96%] rounded-full bg-[#007a52]" />
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between p-8">
                <div>
                  <h2 className="text-2xl font-semibold">Property Health Monitor</h2>
                  <p className="mt-1 text-lg text-[#303744]">
                    Real-time IoT diagnostics across all active sites
                  </p>
                </div>
                <span className="font-bold uppercase tracking-widest text-[#007a52]">
                  ● Live Systems
                </span>
              </header>
              <div className="grid gap-5 border-y border-[#cbd3df] p-8 md:grid-cols-2">
                {healthItems.map(([icon, title, detail, status]) => (
                  <article
                    key={title}
                    className="flex items-center gap-5 rounded-lg border border-[#cbd3df] bg-[#f8faff] p-5"
                  >
                    <span className="material-symbols-outlined rounded-md bg-[#e5efff] p-4 text-3xl">
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-bold">{title}</h3>
                      <p className="text-lg text-[#303744]">{detail}</p>
                    </div>
                    <span
                      className={`text-sm font-bold uppercase ${
                        status === 'HVAC Alert'
                          ? 'text-orange-500'
                          : status === 'Standby'
                            ? 'text-[#8b929c]'
                            : 'text-[#007a52]'
                      }`}
                    >
                      {status}
                    </span>
                  </article>
                ))}
              </div>
              <button className="flex w-full items-center justify-center gap-2 bg-[#edf4ff] py-5 font-bold">
                View All Device Metrics
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </section>

            <aside className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between border-b border-[#cbd3df] p-8">
                <h2 className="text-2xl font-semibold">Inquiries</h2>
                <span className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
                  12 New
                </span>
              </header>
              {[
                ['Elena Rodriguez', 'Interested in Apex Industrial...', '2h ago'],
                ['Marcus Chen', 'Tour request for Zenith Tower...', '5h ago'],
                ['Sarah Jenkins', 'Partnership inquiry for multi-uni...', 'Yesterday'],
              ].map(([name, text, time], index) => (
                <article key={name} className="flex gap-4 border-b border-[#d8dde6] p-6 last:border-b-0">
                  <img
                    src={`https://images.unsplash.com/photo-${index === 0 ? '1573496359142-b8d87734a5a2' : index === 1 ? '1560250097-0b93528c311a' : '1494790108377-be9c29b29330'}?auto=format&fit=crop&w=120&q=80`}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="truncate font-bold">{name}</h3>
                      <span className="text-sm text-[#596170]">{time}</span>
                    </div>
                    <p className="truncate text-[#303744]">{text}</p>
                  </div>
                </article>
              ))}
              <button className="w-full py-6 font-bold">View All Inquiries</button>
            </aside>
          </div>

          <section className="mt-10 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <header className="flex items-center justify-between p-8">
              <h2 className="text-2xl font-semibold">Managed Assets</h2>
              <div className="flex gap-3">
                <button className="rounded-md border border-[#b9c3d2] px-5 py-2">Filter</button>
                <button className="rounded-md border border-[#b9c3d2] px-5 py-2">Sort</button>
              </div>
            </header>
            <div className="grid min-w-[860px] grid-cols-[1.3fr_1fr_1fr_0.7fr_1fr] bg-[#edf4ff] px-8 py-5 font-semibold uppercase tracking-widest text-[#303744]">
              <span>Asset Name</span>
              <span>Location</span>
              <span>Valuation</span>
              <span>Yield</span>
              <span>Status</span>
            </div>
            {[
              ['The Zenith Tower', 'Downtown Metro, NY', '$18,400,000', '5.8%', '98% Leased'],
              ['Riverview Lofts', 'East Banks, OR', '$12,250,000', '6.2%', '100% Leased'],
              ['Silicon Plaza HQ', 'Palo Alto, CA', '$9,700,000', '4.9%', '85% Leased'],
            ].map((row) => (
              <div key={row[0]} className="grid min-w-[860px] grid-cols-[1.3fr_1fr_1fr_0.7fr_1fr] border-t border-[#d8dde6] px-8 py-7 text-lg">
                <strong>{row[0]}</strong>
                <span>{row[1]}</span>
                <span>{row[2]}</span>
                <strong className="text-[#007a52]">{row[3]}</strong>
                <span className="w-fit rounded-full bg-[#62efad] px-4 py-1 text-sm font-bold uppercase text-[#006c48]">
                  {row[4]}
                </span>
              </div>
            ))}
          </section>
        </section>
      </main>
    </PropTechShell>
  )
}
