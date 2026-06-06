import React from 'react'
import { Link } from 'react-router-dom'

const infrastructure = [
  ['device_thermostat', 'HVAC Cluster', '72°F', 'Active'],
  ['bolt', 'Energy Load', '1.2 kW', 'Optimal'],
  ['shield', 'Biometrics', 'Ready', 'Secured'],
  ['water_drop', 'Filtration', '99.9%', 'Safe'],
]

const amenities = [
  ['pool', 'Infinity Lap Pool', 'Heated saltwater with filtration sensors.'],
  ['garage', 'EV Private Garage', 'Dual superchargers with V2G capability.'],
  ['wine_bar', 'Climate-Controlled Cellar', 'IoT monitoring for 500+ vintage bottles.'],
]

export default function MobilePropertyDetails() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#f5f7fc] pb-28 text-[#071121]">
      <header className="absolute left-1/2 top-0 z-20 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-between px-5 py-4">
        <Link to="/mobile/explore" className="grid h-11 w-11 place-items-center rounded-full bg-[#dbeafe]">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <p className="font-black">Property Hub</p>
        <button className="grid h-11 w-11 place-items-center rounded-full bg-[#dbeafe]">
          <span className="material-symbols-outlined">ios_share</span>
        </button>
      </header>

      <section className="relative">
        <img
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=85"
          alt=""
          className="h-[420px] w-full object-cover"
        />
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span className="h-2 w-2 rounded-full bg-white/60" />
          <span className="h-2 w-2 rounded-full bg-white/60" />
        </div>
      </section>

      <main>
        <section className="bg-white px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="rounded bg-[#62efad] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#006c48]">
              Smart Home Certified
            </span>
            <span className="material-symbols-outlined text-3xl text-red-600">favorite</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold">Obsidian Sky Residence</h1>
          <p className="mt-1 flex items-center gap-1 text-[#303744]">
            <span className="material-symbols-outlined text-base">location_on</span>
            Upper East Side, New York
          </p>
          <p className="mt-6 text-3xl font-bold text-[#007a52]">
            $12,450,000 <span className="text-xs uppercase tracking-widest text-black">/ Final Price</span>
          </p>
        </section>

        <section className="grid grid-cols-3 divide-x divide-[#cbd3df] bg-[#eaf2ff] px-6 py-5 text-center">
          {[
            ['bed', '5', 'Beds'],
            ['bathtub', '4.5', 'Baths'],
            ['square_foot', '4,200', 'SqFt'],
          ].map(([icon, value, label]) => (
            <div key={label}>
              <span className="material-symbols-outlined">{icon}</span>
              <p className="font-bold">{value}</p>
              <p className="text-sm">{label}</p>
            </div>
          ))}
        </section>

        <section className="px-6 py-8">
          <h2 className="font-semibold">Smart Infrastructure</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {infrastructure.map(([icon, label, value, status]) => (
              <article key={label} className="rounded-lg border border-[#cbd3df] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[#007a52]">{icon}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#007a52]">
                    <span className="h-2 w-2 rounded-full bg-[#007a52]" />
                    {status}
                  </span>
                </div>
                <p className="mt-4 text-sm">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#dbeafe] px-6 py-8">
          <h2 className="font-semibold">Premium Amenities</h2>
          <div className="mt-5 space-y-4">
            {amenities.map(([icon, title, body]) => (
              <article key={title} className="flex gap-4">
                <span className="material-symbols-outlined grid h-12 w-12 place-items-center rounded-md border border-[#b8c9e6] bg-white">
                  {icon}
                </span>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-sm text-[#303744]">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-6 py-8">
          <h2 className="font-semibold">Location</h2>
          <div className="relative mt-5 overflow-hidden rounded-lg">
            <img
              src="https://images.unsplash.com/photo-1569336415962-a4bd9f69c07a?auto=format&fit=crop&w=700&q=85"
              alt=""
              className="h-52 w-full object-cover"
            />
            <span className="material-symbols-outlined absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black text-4xl text-white">
              location_on
            </span>
          </div>
          <p className="mt-4 text-sm text-[#303744]">
            Located in the heart of the tech-corridor with proximity to Central Park and
            global enterprise headquarters.
          </p>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 z-20 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-[112px_1fr] gap-3 border-t border-[#cbd3df] bg-white px-5 py-4">
        <button className="rounded-lg border border-[#7e91aa] bg-[#dbeafe] py-4 font-semibold">
          Contact Agent
        </button>
        <button className="rounded-lg bg-black py-4 font-semibold text-white">
          <span className="material-symbols-outlined mr-2 align-middle text-base">calendar_month</span>
          Book Viewing
        </button>
      </footer>
    </div>
  )
}
