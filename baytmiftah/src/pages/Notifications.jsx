import React from 'react'
import EnterpriseShell from '../components/EnterpriseShell'

const notifications = [
  {
    icon: 'lock',
    title: 'Smart lock activity detected',
    time: 'Just now',
    body:
      'The main entry lock at Penthouse B - 1204 was accessed via authorized mobile credential.',
    action: 'View Logs',
    strong: true,
  },
  {
    image:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=500&q=80',
    title: 'Price drop on a favorite property',
    time: '2h ago',
    body:
      '$1.2M -> $1.15M. Skyline Terrace Heights has seen a significant price adjustment.',
    action: 'Review new listing details',
  },
  {
    icon: 'person',
    title: 'Sarah Jenkins (Legal Dept)',
    time: '5h ago',
    body:
      'The closing documents for the Mercer Square deal are ready for electronic signature.',
    action: 'Reply',
  },
  {
    icon: 'schedule',
    title: 'System Update Scheduled',
    time: '8h ago',
    body:
      'Maintenance window starting at 02:00 AM UTC. Smart Property telemetry may briefly be intermittent.',
  },
]

export default function Notifications() {
  return (
    <EnterpriseShell
      activeSection="Settings"
      searchPlaceholder="Search alerts, assets, or events..."
    >
      <main className="px-5 py-14 md:px-10">
        <div className="max-w-6xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Notification Center
              </h1>
              <p className="mt-2 text-body-lg text-on-surface-variant">
                Stay updated with your real estate ecosystem and device network.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-outline-variant bg-surface-container p-2">
              <button className="rounded-md bg-secondary px-6 py-3 text-on-secondary">
                All Notifications
              </button>
              <span className="px-3 text-on-surface-variant">Unread Only</span>
              <span className="h-7 w-12 rounded-full bg-surface-container-high" />
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-4">
              {[
                ['System', 'grid_view', '12'],
                ['Messages', 'chat_bubble', '4'],
                ['Smart Property', 'monitoring', '2'],
              ].map(([label, icon, count]) => (
                <button
                  key={label}
                  className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-6 text-left"
                >
                  <span className="flex items-center gap-4">
                    <span className="material-symbols-outlined">{icon}</span>
                    <span className="font-semibold">{label}</span>
                  </span>
                  <span className="rounded-full bg-secondary/20 px-3 py-1 text-secondary">
                    {count}
                  </span>
                </button>
              ))}
            </aside>

            <section className="space-y-5">
              {notifications.map((item) => (
                <article
                  key={item.title}
                  className={`rounded-lg border bg-surface-container p-7 ${
                    item.strong
                      ? 'border-l-4 border-secondary border-y-outline-variant border-r-outline-variant'
                      : 'border-outline-variant'
                  }`}
                >
                  <div className="grid gap-5 md:grid-cols-[80px_1fr_auto]">
                    <div>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-20 w-20 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-secondary/20 text-secondary">
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold">{item.title}</h2>
                      <p className="mt-2 text-body-lg text-on-surface-variant">
                        {item.body}
                      </p>
                      {item.action && (
                        <button className="mt-5 rounded-md bg-secondary px-5 py-3 font-semibold text-on-secondary">
                          {item.action}
                        </button>
                      )}
                    </div>
                    <span className="text-on-surface-variant">{item.time}</span>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>
    </EnterpriseShell>
  )
}
