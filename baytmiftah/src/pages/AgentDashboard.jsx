import React from 'react'
import EnterpriseShell from '../components/EnterpriseShell'

const metrics = [
  {
    label: 'Active Listings',
    value: '42',
    detail: 'Portfolio occupancy',
    change: '+12%',
    tone: 'good',
    icon: 'home_work',
  },
  {
    label: 'Lead Volume',
    value: '1,284',
    detail: '248 new this week',
    change: '+8.4%',
    tone: 'good',
    icon: 'groups',
  },
  {
    label: 'Conversion Rate',
    value: '3.2%',
    detail: 'Target: 4.5%',
    change: '-2%',
    tone: 'bad',
    icon: 'monitoring',
  },
  {
    label: 'Total Revenue',
    value: '$4.8M',
    detail: 'Year-to-date sales',
    change: '',
    tone: 'dark',
    icon: 'payments',
  },
]

const listings = [
  {
    title: 'The Obsidian Heights',
    location: 'Beverly Hills, CA',
    status: 'For Sale',
    price: '$12,500,000',
    metricLabel: 'Virtual Tours',
    metric: '482',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Foundry Loft Unit 402',
    location: 'Brooklyn, NY',
    status: 'Under Contract',
    price: '$2,100,000',
    metricLabel: 'Inquiries',
    metric: '24',
    image:
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=600&q=80',
  },
]

const activity = [
  {
    title: 'New Inquiry: Sarah Jenkins',
    body: 'Requested viewing for The Obsidian Heights.',
    time: '14 minutes ago',
    icon: 'mail',
    tone: 'bg-secondary text-on-secondary',
  },
  {
    title: 'Offer Accepted',
    body: 'Harbor Point #12C is now under contract.',
    time: '2 hours ago',
    icon: 'check_circle',
    tone: 'bg-primary text-on-primary',
  },
  {
    title: 'Price Adjustment',
    body: 'Reduced listing price for Westside Manor by $50,000.',
    time: '5 hours ago',
    icon: 'update',
    tone: 'bg-tertiary-container text-on-tertiary-container',
  },
  {
    title: 'Action Required',
    body: 'Escrow documents for Silver Lake House are overdue.',
    time: 'Yesterday',
    icon: 'warning',
    tone: 'bg-error/10 text-error',
  },
]

const leadBars = [42, 58, 49, 72, 62, 82, 54, 66, 46, 68, 58, 76]
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AgentDashboard() {
  return (
    <EnterpriseShell
      activeSection="Agency"
      searchPlaceholder="Search leads, properties, or metrics..."
    >
      <main className="px-5 py-8 md:px-10">
        <section className="max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-secondary md:text-5xl">
                Agent Dashboard
              </h1>
              <p className="mt-2 text-body-lg text-on-surface-variant">
                Performance overview for Q3 financial cycle.
              </p>
            </div>
            <button className="inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-lg border border-outline-variant bg-surface-container px-5 font-semibold">
              <span className="material-symbols-outlined">calendar_month</span>
              Last 30 Days
            </button>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className={`min-h-56 rounded-lg border border-outline-variant p-7 shadow-sm ${
                  metric.tone === 'dark'
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-lg ${
                      metric.tone === 'dark'
                        ? 'bg-white/15'
                        : 'bg-secondary/10 text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined">{metric.icon}</span>
                  </span>
                  {metric.change && (
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        metric.tone === 'bad'
                          ? 'bg-error/10 text-error'
                          : 'bg-secondary/15 text-secondary'
                      }`}
                    >
                      {metric.change}
                    </span>
                  )}
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                  {metric.label}
                </p>
                <p className="mt-2 text-4xl font-bold">{metric.value}</p>
                <p
                  className={`mt-5 ${
                    metric.tone === 'dark'
                      ? 'text-on-secondary/75'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {metric.detail}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_390px]">
            <div className="space-y-8">
              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-3xl font-semibold text-secondary">
                    Top Performing Listings
                  </h2>
                  <button className="font-semibold text-secondary">View All</button>
                </div>

                <div className="mt-8 space-y-8">
                  {listings.map((listing) => (
                    <article
                      key={listing.title}
                      className="grid gap-5 border-b border-outline-variant pb-8 last:border-b-0 last:pb-0 md:grid-cols-[120px_1fr_auto]"
                    >
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="h-28 w-full rounded-lg object-cover md:w-28"
                      />
                      <div className="min-w-0">
                        <h3 className="text-2xl font-semibold leading-tight">
                          {listing.title}
                        </h3>
                        <p className="mt-2 flex items-center gap-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-base">
                            location_on
                          </span>
                          {listing.location}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <span className="rounded-md bg-secondary/15 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-secondary">
                            {listing.status}
                          </span>
                          <strong>{listing.price}</strong>
                        </div>
                      </div>
                      <div className="self-center text-left md:text-right">
                        <p className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                          {listing.metricLabel}
                        </p>
                        <p className="mt-1 text-2xl font-bold">{listing.metric}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-3xl font-semibold text-secondary">
                    Lead Generation Trend
                  </h2>
                  <div className="flex items-center gap-4 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-secondary" />
                      Direct
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-primary" />
                      Referral
                    </span>
                  </div>
                </div>
                <div className="mt-8 grid h-48 grid-cols-12 items-end gap-2 sm:gap-4">
                  {leadBars.map((height, index) => (
                    <div key={months[index]} className="flex h-full flex-col justify-end gap-3">
                      <div
                        className="rounded-t-lg bg-outline-variant"
                        style={{ height: `${height}%` }}
                        aria-label={`${months[index]} lead generation ${height}`}
                      />
                      <span className="text-center text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        {months[index]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-3xl font-semibold text-secondary">
                  Recent Activity
                </h2>
                <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container-high">
                  <span className="material-symbols-outlined">refresh</span>
                </button>
              </div>

              <div className="mt-8 space-y-8">
                {activity.map((item) => (
                  <article key={item.title} className="grid grid-cols-[48px_1fr] gap-4">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${item.tone}`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {item.icon}
                      </span>
                    </span>
                    <div>
                      <h3 className="font-semibold leading-tight">{item.title}</h3>
                      <p className="mt-1 text-on-surface-variant">{item.body}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        {item.time}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <button className="btn-secondary mt-10 w-full justify-center">
                View Activity Log
              </button>
            </aside>
          </div>
        </section>
      </main>
    </EnterpriseShell>
  )
}
