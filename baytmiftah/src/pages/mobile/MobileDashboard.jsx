import React from 'react'
import { Link } from 'react-router-dom'

const activity = [
  ['payments', 'Rent payment received for Unit 402, Skyline Towers', '2 hours ago • Financial'],
  ['warning', 'HVAC alert detected in Industrial Hub A', '5 hours ago • Smart Property'],
  ['group_add', 'New lead assigned: Sarah Jenkins', 'Yesterday • Agency'],
]

export default function MobileDashboard() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#f5f7fc] pb-24 text-[#071121]">
      <header className="flex items-center justify-between border-b border-[#ccd3df] px-6 py-5">
        <h1 className="text-2xl font-black">BaytMiftah</h1>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined">notifications</span>
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        </div>
      </header>

      <main className="space-y-8 px-6 py-6">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]">Dashboard Overview</p>
          <h2 className="mt-2 text-2xl font-semibold">Good Morning, Alexander</h2>
          <div className="mt-6 rounded-lg bg-[#111827] p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-[#aab3c2]">Portfolio Value</p>
                <p className="mt-2 text-3xl font-bold">$1,284,000</p>
                <p className="mt-2 text-sm font-semibold text-[#F5D76B]">↗ +4.2% this month</p>
              </div>
              <span className="material-symbols-outlined rounded-md bg-white/10 p-3">
                account_balance_wallet
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              ['check_circle', 'Active Leads', '24'],
              ['bolt', 'IoT Status', '98% •'],
            ].map(([icon, label, value]) => (
              <div key={label} className="rounded-lg border border-[#cbd3df] bg-white p-5">
                <span className="material-symbols-outlined text-[#E9C349]">{icon}</span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest">{label}</p>
                <p className="mt-1 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Quick Actions</h2>
          <div className="mt-5 grid grid-cols-[1fr_112px] gap-3">
            <Link
              to="/explore"
              className="relative flex h-48 items-end overflow-hidden rounded-lg bg-black p-5 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=600&q=85"
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />
              <div className="relative">
                <span className="material-symbols-outlined">storefront</span>
                <p className="font-bold">Marketplace</p>
                <p className="text-white/80">Browse New Listings</p>
              </div>
            </Link>
            <div className="grid gap-3">
              <Link
                to="/agency/dashboard"
                className="grid place-items-center rounded-lg bg-[#dbeafe] text-center font-bold"
              >
                <span className="material-symbols-outlined">business_center</span>
                Agency
              </Link>
              <Link
                to="/smart-property/devices"
                className="grid place-items-center rounded-lg bg-[#062d3a] text-center font-bold text-white"
              >
                <span className="material-symbols-outlined text-[#38bdf8]">
                  settings_input_antenna
                </span>
                Smart
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Activity</h2>
            <button className="font-semibold uppercase tracking-widest text-[#E9C349]">View All</button>
          </div>
          <div className="mt-4 space-y-4">
            {activity.map(([icon, text, time]) => (
              <article key={text} className="flex gap-4 rounded-lg border border-[#cbd3df] bg-white p-5">
                <span className="material-symbols-outlined h-fit rounded-full bg-[#fff4bf] p-3 text-[#E9C349]">
                  {icon}
                </span>
                <div>
                  <p>{text}</p>
                  <p className="mt-1 text-[#4b5563]">{time}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Top Listing for You</h2>
          <article className="mt-4 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=700&q=85"
                alt=""
                className="h-56 w-full object-cover"
              />
              <span className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-bold">
                $4,250,000
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold">The Zenith Corporate Center</h3>
              <p className="text-[#4b5563]">452 Innovation Blvd, Tech City</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#d8dde6] pt-4">
                <span>12k sqft</span>
                <span>Grade A</span>
                <span className="material-symbols-outlined text-[#E9C349]">favorite</span>
              </div>
            </div>
          </article>
        </section>
      </main>

      <Link
        to="/create-listing"
        className="fixed bottom-16 left-1/2 z-20 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-black text-white shadow-xl"
      >
        <span className="material-symbols-outlined">add</span>
      </Link>

      <nav className="fixed bottom-0 left-1/2 z-10 grid h-16 w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-[#ccd3df] bg-white text-xs">
        {[
          ['storefront', 'Marketplace'],
          ['business_center', 'Agency'],
          ['dashboard', 'Dashboard'],
          ['settings_input_antenna', 'Smart'],
          ['settings', 'Settings'],
        ].map(([icon, label]) => (
          <button
            key={label}
            className={`flex flex-col items-center justify-center gap-1 ${
              label === 'Dashboard' ? 'bg-[#fff7d6] text-[#E9C349]' : 'text-[#303744]'
            }`}
          >
            <span className="material-symbols-outlined">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
