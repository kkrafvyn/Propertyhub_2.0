import React from 'react'
import { Link } from 'react-router-dom'

export default function MobileMessages() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#f5f7fc] pb-36 text-[#071121]">
      <header className="sticky top-0 z-20 border-b border-[#ccd3df] bg-white">
        <div className="flex items-center gap-4 px-6 py-4">
          <Link to="/mobile/dashboard">
            <span className="material-symbols-outlined text-4xl">arrow_back</span>
          </Link>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80"
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
            <span className="absolute bottom-1 right-0 h-4 w-4 rounded-full border-2 border-white bg-[#E9C349]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">Elena Rodriguez</h1>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#E9C349]">
              Online • Senior Agent
            </p>
          </div>
          <span className="material-symbols-outlined">call</span>
          <span className="material-symbols-outlined">videocam</span>
        </div>
        <div className="flex items-center gap-4 bg-[#eaf2ff] px-6 py-4">
          <img
            src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=160&q=80"
            alt=""
            className="h-16 w-16 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">Skyview Penthouse</h2>
            <p className="truncate text-[#303744]">4200 Broadway, Unit 45B • $2,450,000</p>
          </div>
          <button className="grid h-14 w-14 place-items-center rounded-full bg-[#dbeafe]">
            <span className="material-symbols-outlined text-4xl">expand_more</span>
          </button>
        </div>
      </header>

      <main className="space-y-6 px-6 py-8">
        <div className="mx-auto w-fit rounded-full bg-[#dbeafe] px-8 py-2 font-semibold uppercase tracking-[0.24em] text-[#4b5563]">
          Today
        </div>
        <div>
          <div className="max-w-[86%] rounded-lg bg-[#cfe3ff] p-6 text-2xl leading-relaxed shadow-sm">
            Hi there! I&apos;ve just updated the documentation for the Skyview Penthouse.
            Would you like me to send over the floor plans and the latest HOA report?
          </div>
          <p className="mt-2 text-sm text-[#4b5563]">09:41 AM</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="max-w-[86%] rounded-lg bg-black p-6 text-2xl leading-relaxed text-white shadow-lg">
            Yes, please! Especially the HOA report. I&apos;m also curious if the balcony
            faces east for the morning sun.
          </div>
          <p className="mt-2 text-sm text-[#4b5563]">
            09:44 AM <span className="text-[#E9C349]">✓✓</span>
          </p>
        </div>
        <div>
          <div className="max-w-[86%] rounded-lg bg-[#cfe3ff] p-5 shadow-sm">
            <div className="flex items-center gap-4 rounded-lg border border-[#b8c9e6] bg-[#edf4ff] p-4">
              <span className="material-symbols-outlined rounded bg-[#fecaca] p-3 text-red-700">
                picture_as_pdf
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold">HOA_Report_2024.pdf</p>
                <p className="text-[#4b5563]">2.4 MB</p>
              </div>
              <span className="material-symbols-outlined text-4xl">download</span>
            </div>
            <p className="mt-5 text-2xl leading-relaxed">
              Here is the file. And yes, the balcony has a perfect 180-degree eastern
              exposure. It&apos;s stunning for sunrises!
            </p>
          </div>
          <p className="mt-2 text-sm text-[#4b5563]">09:46 AM</p>
        </div>
      </main>

      <div className="fixed bottom-20 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 gap-3 border-t border-[#cbd3df] bg-white px-5 py-4">
        <div className="flex h-16 min-w-0 flex-1 items-center gap-4 rounded-full border border-[#c5ceda] bg-[#edf4ff] px-4">
          <span className="material-symbols-outlined text-4xl">add_circle</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-[#8b929c]"
            placeholder="Type a message..."
          />
          <span className="material-symbols-outlined text-4xl">sentiment_satisfied</span>
        </div>
        <button className="grid h-14 w-14 place-items-center self-center rounded-full bg-black text-white">
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>

      <nav className="fixed bottom-0 left-1/2 z-10 grid h-20 w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-[#ccd3df] bg-white text-sm">
        {[
          ['storefront', 'Marketplace'],
          ['business_center', 'Agency'],
          ['settings_input_antenna', 'Smart'],
          ['analytics', 'Analytics'],
          ['settings', 'Settings'],
        ].map(([icon, label]) => (
          <button
            key={label}
            className={`flex flex-col items-center justify-center gap-1 ${
              label === 'Agency' ? 'border-t-4 border-[#E9C349] bg-[#fff7d6] text-[#E9C349]' : ''
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
