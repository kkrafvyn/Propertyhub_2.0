import React from 'react'
import { useNavigate } from 'react-router-dom'
import PropTechShell from '../../components/PropTechShell'

const alerts = [
  ['warning', 'The Sapphire Suites - Unit 402', 'HVAC Failure - Overheating', 'Detected 12m ago / Floor 4', 'text-red-600'],
  ['lock', 'Skyline Tower - Lobby B', 'Unauthorized Access Attempt', 'Detected 45m ago / Entry Point 2', 'text-orange-500'],
  [
    'apartment',
    'Emerald Gardens - Main',
    'Active Monitoring',
    '12 Devices Online / Optimal Energy',
    'text-[#E9C349] bg-[#fff4bf] border-l-4 border-[#E9C349]',
  ],
  ['domain', 'Harbor Heights', 'Disconnected', 'Maintenance in progress', 'text-[#6b7280]'],
]

const logRows = [
  ['radio_button_checked', 'Auto-Regulation', 'HVAC System 4', 'High Temp Threshold', '14:22:10', 'Success'],
  ['schedule', 'Scheduled Lock', 'Main Perimeter', 'Night Profile', '22:00:00', 'Success'],
  ['priority_high', 'Override Attempt', 'Elevator 2', 'Manual Keypad', '03:15:22', 'Blocked'],
  ['lightbulb', 'Energy Save', 'Common Areas', 'Motion Timeout', '04:45:00', 'Success'],
]

const deviceCards = [
  {
    icon: 'device_thermostat',
    title: 'Thermostat',
    value: '72°F',
    detail: 'Set to 70°',
    status: 'Stable',
    accent: 'bg-[#F5D76B] text-[#0F172A]',
  },
  {
    icon: 'lock',
    title: 'Smart Locks',
    value: '8 Doors Secured',
    detail: 'All systems normal',
    status: 'Online',
    accent: 'bg-[#dbeafe]',
  },
  {
    icon: 'bolt',
    title: 'Energy Meter',
    value: '4.2 kW/h',
    detail: 'Demand below peak threshold',
    status: 'Efficient',
    accent: 'bg-[#F5D76B] text-[#0F172A]',
  },
]

export default function DevicesDashboard() {
  const navigate = useNavigate()

  return (
    <PropTechShell
      active="Smart Property"
      brand="Smart Control Center"
      sidebarTitle="PropTech"
      sidebarSubtitle="Agency Command"
      searchPlaceholder="Search devices or units..."
      primaryAction=""
    >
      <main className="px-5 py-8 md:px-8">
        <section className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div className="space-y-8">
            <article className="relative h-80 overflow-hidden rounded-lg border border-[#cbd3df] bg-black shadow">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />
              <span className="absolute left-8 top-8 rounded-full bg-black px-8 py-3 font-bold text-white">
                Live Map View
              </span>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(98,239,173,0.55),transparent_10%),radial-gradient(circle_at_55%_70%,rgba(98,239,173,0.45),transparent_9%)]" />
            </article>

            <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
              <header className="flex items-center justify-between bg-[#edf4ff] px-6 py-5">
                <h2 className="text-2xl font-bold">Active Alerts ({alerts.length - 1})</h2>
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
                <p className="font-bold uppercase tracking-[0.24em] text-[#E9C349]">Property Selected</p>
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
              {deviceCards.map((card, index) => (
                <article
                  key={card.title}
                  className={`rounded-lg border bg-white p-8 ${
                    index === 2 ? 'border-[#F5D76B] border-l-4' : 'border-[#d8dde6]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={`material-symbols-outlined rounded-md p-3 ${card.accent}`}>
                      {card.icon}
                    </span>
                    <span className="font-semibold">{card.status}</span>
                  </div>
                  <p className="mt-5 text-lg text-[#303744]">{card.title}</p>
                  <p className={card.title === 'Thermostat' ? 'text-5xl font-black' : 'text-4xl font-black'}>
                    {card.value}{' '}
                    {card.title === 'Thermostat' && <span className="text-lg font-normal">{card.detail}</span>}
                  </p>
                  {card.title !== 'Thermostat' && (
                    <p className="mt-3 font-semibold uppercase tracking-widest text-[#E9C349]">{card.detail}</p>
                  )}
                  {card.title === 'Energy Meter' && (
                    <div className="mt-6 flex h-12 items-end gap-1">
                      {[18, 24, 16, 29, 20, 32, 24, 27].map((height, barIndex) => (
                        <span
                          key={barIndex}
                          className="flex-1 bg-[#E9C349]"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  )}
                  {card.title === 'Thermostat' && (
                    <div className="mt-6 h-1 rounded-full bg-[#b9c3d2]">
                      <div className="h-1 w-[55%] rounded-full bg-black" />
                    </div>
                  )}
                </article>
              ))}
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
                <div
                  key={`${action}-${time}`}
                  className="grid min-w-[760px] grid-cols-[1fr_1fr_1.1fr_0.8fr_0.8fr] border-t border-[#d8dde6] px-6 py-6 text-lg"
                >
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
                      status === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-[#F5D76B] text-[#0F172A]'
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
