import React from 'react'
import { useNavigate } from 'react-router-dom'
import PropTechShell from '../../components/PropTechShell'

const alerts = [
  ['warning', 'The Sapphire Suites - Unit 402', 'HVAC Failure - Overheating', 'Detected 12m ago • Floor 4', 'text-red-600'],
  ['lock', 'Skyline Tower - Lobby B', 'Unauthorized Access Attempt', 'Detected 45m ago • Entry Point 2', 'text-orange-500'],
  ['apartment', 'Emerald Gardens - Main', 'Active Monitoring', '12 Devices Online • Optimal Energy', 'text-[#007a52] bg-[#dffbf0] border-l-4 border-[#007a52]'],
  ['domain', 'Harbor Heights', 'Disconnected', 'Maintenance in progress', 'text-[#6b7280]'],
]

const logRows = [
  ['radio_button_checked', 'Auto-Regulation', 'HVAC System 4', 'High Temp Threshold', '14:22:10', 'Success'],
  ['schedule', 'Scheduled Lock', 'Main Perimeter', 'Night Profile', '22:00:00', 'Success'],
  ['priority_high', 'Override Attempt', 'Elevator 2', 'Manual Keypad', '03:15:22', 'Blocked'],
  ['lightbulb', 'Energy Save', 'Common Areas', 'Motion Timeout', '04:45:00', 'Success'],
]

export default function DevicesDashboard() {
  const navigate = useNavigate()

  return (
    <PropTechShell
      active="Smart Property"
      brand="Smart Control Center"
      sidebarTitle="PropTech"
      sidebarSubtitle="Management Console"
      searchPlaceholder="Search devices or units..."
      primaryAction=""
    >
      <main className="px-5 py-8 md:px-8">
        <section className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div className="space-y-8">
            <article className="relative overflow-hidden rounded-lg border border-[#cbd3df] bg-black shadow">
              <img
                src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85"
                alt=""
                className="h-80 w-full object-cover opacity-70"
              />
              <span className="absolute left-8 top-8 rounded-full bg-black px-8 py-3 font-bold text-white">
                Live Map View
              </span>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(98,239,173,0.55),transparent_10%),radial-gradient(circle_at_55%_70%,rgba(98,239,173,0.45),transparent_9%)]" />
            </article>

            <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between bg-[#edf4ff] px-6 py-5">
                <h2 className="text-2xl font-bold">Active Alerts (3)</h2>
                <span className="material-symbols-outlined">filter_list</span>
              </header>
              {alerts.map(([icon, title, status, meta, tone]) => (
                <article
                  key={title}
                  className={`flex gap-5 border-t border-[#d8dde6] p-6 ${tone.includes('bg-') ? tone : ''}`}
                >
                  <span className={`material-symbols-outlined text-3xl ${tone.includes('text-') ? tone.split(' ')[0] : tone}`}>
                    {icon}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className={`mt-1 text-lg ${tone.includes('text-') ? tone.split(' ')[0] : tone}`}>
                      {status}
                    </p>
                    <p className="mt-2 text-sm text-[#596170]">{meta}</p>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <div>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="font-bold uppercase tracking-[0.24em] text-[#007a52]">Property Selected</p>
                <h1 className="mt-3 max-w-2xl text-5xl font-black leading-tight">
                  Emerald Gardens - Main
                </h1>
              </div>
              <div className="flex gap-4">
                <button className="rounded-lg border border-[#b9c3d2] bg-[#dbeafe] px-8 py-5 text-xl">
                  Full Report
                </button>
                <button className="rounded-lg bg-black px-8 py-5 text-xl text-white">
                  Lock All Doors
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <article className="rounded-lg border border-[#d8dde6] bg-white p-8">
                <div className="flex justify-between">
                  <span className="material-symbols-outlined rounded-md bg-[#62efad] p-3 text-[#006c48]">
                    device_thermostat
                  </span>
                  <span className="font-semibold">● Stable</span>
                </div>
                <p className="mt-5 text-lg text-[#303744]">Thermostat</p>
                <p className="text-5xl font-black">72°F <span className="text-lg font-normal">Set to 70°</span></p>
                <div className="mt-6 h-1 rounded-full bg-[#b9c3d2]">
                  <div className="h-1 w-[55%] rounded-full bg-black" />
                </div>
              </article>
              <article className="rounded-lg border border-[#d8dde6] bg-white p-8">
                <div className="flex justify-between">
                  <span className="material-symbols-outlined rounded-md bg-[#dbeafe] p-3">lock</span>
                  <span className="h-8 w-16 rounded-full bg-[#007a52]" />
                </div>
                <p className="mt-5 text-lg text-[#303744]">Smart Locks</p>
                <p className="text-4xl font-black">8 Doors Secured</p>
                <p className="mt-3 font-semibold uppercase tracking-widest text-[#007a52]">All systems normal</p>
              </article>
              <article className="rounded-lg border border-[#62efad] border-l-4 bg-white p-8">
                <div className="flex justify-between">
                  <span className="material-symbols-outlined rounded-md bg-[#62efad] p-3 text-[#006c48]">
                    bolt
                  </span>
                  <span className="material-symbols-outlined">open_in_new</span>
                </div>
                <p className="mt-5 text-lg text-[#303744]">Energy Meter</p>
                <p className="text-4xl font-black">4.2 kW/h</p>
                <div className="mt-6 flex h-12 items-end gap-1">
                  {[18, 24, 16, 29, 20, 32, 24, 27].map((height, index) => (
                    <span
                      key={index}
                      className="flex-1 bg-[#007a52]"
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>
              </article>
            </div>

            <section className="mt-8 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between p-6">
                <h2 className="text-2xl font-bold">Automation History Log</h2>
                <button className="font-semibold">Clear History</button>
              </header>
              <div className="grid min-w-[760px] grid-cols-[1fr_1fr_1.1fr_0.8fr_0.8fr] bg-[#f2f5fb] px-6 py-4 text-xl font-semibold">
                <span>Action Type</span>
                <span>Device</span>
                <span>Trigger</span>
                <span>Time</span>
                <span>Status</span>
              </div>
              {logRows.map(([icon, action, device, trigger, time, status]) => (
                <div key={`${action}-${time}`} className="grid min-w-[760px] grid-cols-[1fr_1fr_1.1fr_0.8fr_0.8fr] border-t border-[#d8dde6] px-6 py-6 text-lg">
                  <span className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${status === 'Blocked' ? 'text-red-600' : ''}`}>
                      {icon}
                    </span>
                    {action}
                  </span>
                  <span>{device}</span>
                  <span>{trigger}</span>
                  <span>{time}</span>
                  <span
                    className={`w-fit rounded px-3 py-1 text-xs font-bold uppercase ${
                      status === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-[#62efad] text-[#006c48]'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </section>
          </div>
        </section>

        <button
          onClick={() => navigate('/smart-property/add-device')}
          className="fixed bottom-8 right-8 rounded-full bg-black px-8 py-5 text-xl font-bold text-white shadow-xl"
        >
          <span className="material-symbols-outlined mr-2 align-middle">add_circle</span>
          New Device
        </button>
      </main>
    </PropTechShell>
  )
}
