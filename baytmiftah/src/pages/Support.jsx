import React, { useMemo, useState } from 'react'
import EnterpriseShell from '../components/EnterpriseShell'

const topics = ['Marketplace Fees', 'API Documentation', 'User Permissions']
const quickLinks = [
  { label: 'Marketplace', icon: 'storefront', articles: 18 },
  { label: 'Payments', icon: 'payments', articles: 12 },
  { label: 'Smart Home', icon: 'settings_input_antenna', articles: 16 },
  { label: 'Agency Ops', icon: 'business_center', articles: 21 },
]

export default function Support() {
  const [query, setQuery] = useState('')
  const filteredLinks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return quickLinks
    return quickLinks.filter((link) => link.label.toLowerCase().includes(needle))
  }, [query])

  return (
    <EnterpriseShell activeSection="Support" searchPlaceholder="Search resources...">
      <main className="bg-[#f5f7fc]">
        <section className="bg-[linear-gradient(110deg,#eaf2ff_0%,#f6f8ff_58%,#e9f7fb_100%)] px-5 py-16 text-center md:px-10">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-4xl font-black leading-tight md:text-6xl">How can we help?</h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-[#303744]">
              Access our comprehensive guide for property owners, agents, and technical
              installers. Search thousands of documented solutions.
            </p>

            <div className="mx-auto mt-9 flex max-w-3xl items-center gap-4 rounded-lg border border-[#9ba4b2] bg-white p-2 shadow-lg shadow-slate-900/10">
              <span className="material-symbols-outlined pl-4 text-[#303744]">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent py-4 text-lg outline-none placeholder:text-[#667085]"
                placeholder="Search for 'Setting up IoT Hub' or 'Listing fees'..."
              />
              <button className="rounded-md bg-black px-8 py-4 font-bold text-white">Search</button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
              <span className="text-[#303744]">Trending:</span>
              {topics.map((topic) => (
                <button key={topic} className="font-semibold text-[#E9C349]">
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-5 py-14 md:px-10 lg:grid-cols-3">
          <div className="grid gap-4 md:grid-cols-4 lg:col-span-3">
            {filteredLinks.map((link) => (
              <button
                key={link.label}
                className="flex items-center justify-between rounded-lg border border-[#cbd3df] bg-white p-5 text-left shadow-sm"
              >
                <span className="flex items-center gap-3 font-bold">
                  <span className="material-symbols-outlined text-[#E9C349]">{link.icon}</span>
                  {link.label}
                </span>
                <span className="rounded-full bg-[#fff7d6] px-3 py-1 text-sm font-bold text-[#0F172A]">
                  {link.articles}
                </span>
              </button>
            ))}
            {filteredLinks.length === 0 && (
              <div className="rounded-lg border border-[#cbd3df] bg-white p-6 text-center md:col-span-4">
                <span className="material-symbols-outlined text-4xl text-[#E9C349]">search_off</span>
                <p className="mt-2 font-semibold">No help categories match that search.</p>
              </div>
            )}
          </div>

          <article className="rounded-lg border border-[#cbd3df] bg-white p-8 lg:col-span-2">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-7 h-12 w-12 rounded-md bg-[#111827]" />
                <h2 className="text-3xl font-bold leading-tight">Using the Marketplace</h2>
                <p className="mt-5 max-w-sm text-lg leading-7 text-[#303744]">
                  Everything you need to know about listing properties, bidding processes,
                  and transaction security on our decentralized real estate network.
                </p>
                <ul className="mt-7 space-y-4 text-sm">
                  {[
                    'How to verify your seller profile',
                    'Understanding auction smart contracts',
                    'Asset fractionalization guides',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=700&q=85"
                alt=""
                className="h-80 w-full rounded-md object-cover"
              />
            </div>
          </article>

          <article className="rounded-lg border border-[#b7e6dd] bg-[#fff7d6] p-8">
            <div className="mb-8 grid h-12 w-12 place-items-center rounded-md bg-[#E9C349] text-white">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h2 className="text-3xl font-bold">Payments & Billing</h2>
            <p className="mt-3 leading-6 text-[#303744]">
              Manage your subscription, view historical invoices, and configure escrow
              payment methods.
            </p>
            <div className="mt-28 border-t border-[#b7e6dd] pt-5">
              <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#E9C349]">
                12 articles
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </article>

          <article className="rounded-lg bg-[#111827] p-8 text-white lg:col-span-1">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-md bg-white/10">
              <span className="material-symbols-outlined">settings_input_antenna</span>
            </div>
            <h2 className="text-3xl font-bold">Smart Home & IoT Setup</h2>
            <p className="mt-5 leading-7 text-[#d8dee9]">
              Technical documentation for connecting hardware, configuring automation
              rules, and monitoring real-time property data.
            </p>
            <div className="mt-8 flex gap-2">
              <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-bold">Hardware</span>
              <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-bold">Config</span>
            </div>
          </article>

          <article className="rounded-lg border border-[#cbd3df] bg-white p-8 lg:col-span-2">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-md bg-[#dbeafe]">
              <span className="material-symbols-outlined">business_center</span>
            </div>
            <h2 className="text-3xl font-bold">Agency Operations</h2>
            <p className="mt-5 max-w-xl leading-7 text-[#303744]">
              Admin tools for managing team permissions, lead generation workflows, and
              customer relationship management integrations.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="rounded-md border border-[#cbd3df] bg-[#f8faff] px-6 py-3 font-semibold">
                Team Management
              </button>
              <button className="rounded-md border border-[#cbd3df] bg-[#f8faff] px-6 py-3 font-semibold">
                Lead Pipelines
              </button>
            </div>
          </article>

          <article className="flex flex-col gap-6 rounded-lg border-l-4 border-[#E9C349] bg-white p-8 shadow-sm lg:col-span-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Still have questions?</h2>
              <p className="mt-3 text-lg text-[#303744]">
                Our support engineers are available 24/7 via live chat for enterprise clients.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button className="rounded-md bg-[#E9C349] px-10 py-4 font-bold text-white">
                Open Live Chat
              </button>
              <button className="rounded-md border border-[#9ba4b2] bg-white px-10 py-4 font-bold">
                Submit Ticket
              </button>
            </div>
          </article>
        </section>

        <footer className="border-t border-[#cbd3df] bg-white px-5 py-10 md:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-8 text-sm">
            <strong className="text-2xl">BaytMiftah</strong>
            <span className="uppercase tracking-widest">Help Center</span>
            <span>Legal</span>
            <span>Privacy</span>
            <span>Cookies</span>
            <span>Security</span>
            <span className="ml-auto">© 2026 BaytMiftah Holdings</span>
          </div>
        </footer>
      </main>
    </EnterpriseShell>
  )
}
