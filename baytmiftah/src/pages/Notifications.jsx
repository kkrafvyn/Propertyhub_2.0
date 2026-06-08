import React, { useEffect, useMemo, useState } from 'react'
import EnterpriseShell from '../components/EnterpriseShell'
import {
  dispatchNotification,
  getNotificationPreferences,
  loadLocalNotificationPreferences,
  saveNotificationPreferences,
} from '../services/notification-service'
import { subscribeToNotifications } from '../services/notification-realtime-service'
import { DataBanner } from '../components/UI'

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
  const [category, setCategory] = useState('All')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [preferences, setPreferences] = useState(loadLocalNotificationPreferences)
  const [preferenceSource, setPreferenceSource] = useState('local')
  const [savingPreference, setSavingPreference] = useState('')
  const [liveNotifications, setLiveNotifications] = useState([])
  const [realtimeStatus, setRealtimeStatus] = useState('idle')
  const [dispatchStatus, setDispatchStatus] = useState('')

  useEffect(() => {
    let ignore = false

    getNotificationPreferences().then((result) => {
      if (!ignore) {
        setPreferences(result.preferences)
        setPreferenceSource(result.source)
      }
    })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let user = null
    try {
      user = JSON.parse(localStorage.getItem('baytmiftah_user') || 'null')
    } catch {
      user = null
    }

    const subscription = subscribeToNotifications(
      user?.id,
      (notification) => {
        setLiveNotifications((current) => [
          {
            icon: notification.category === 'lead' ? 'person' : 'notifications',
            title: notification.title,
            time: 'Just now',
            body: notification.body || 'New platform event received.',
            action: notification.action_url ? 'Open' : null,
            strong: true,
          },
          ...current,
        ])
      },
      setRealtimeStatus
    )

    return () => subscription.unsubscribe()
  }, [])

  const updatePreference = async (key) => {
    const next = {
      ...preferences,
      [key]: !preferences[key],
    }
    setPreferences(next)
    setSavingPreference(key)
    const result = await saveNotificationPreferences(next)
    setPreferenceSource(result.source)
    setSavingPreference('')
  }

  const sendTestNotification = async () => {
    let user = null
    try {
      user = JSON.parse(localStorage.getItem('baytmiftah_user') || 'null')
    } catch {
      user = null
    }

    setDispatchStatus('Sending test notification...')
    const result = await dispatchNotification({
      userId: user?.id,
      title: 'BaytMiftah delivery check',
      body: 'Realtime, email, SMS, and stored notification delivery are wired through the notifications Edge Function.',
      category: 'system',
      emailTo: preferences.email ? user?.email : undefined,
      smsTo: preferences.sms ? user?.phone : undefined,
    })

    setLiveNotifications((current) => [
      {
        icon: 'notifications',
        title: result.notification?.title || 'BaytMiftah delivery check',
        time: 'Just now',
        body: result.notification?.body || 'Notification dispatch finished.',
        strong: true,
      },
      ...current,
    ])
    setDispatchStatus(
      result.source === 'supabase'
        ? 'Dispatch function completed.'
        : `Local dispatch fallback active${result.error ? `: ${result.error}` : '.'}`
    )
  }

  const visibleNotifications = useMemo(() => {
    const allNotifications = [...liveNotifications, ...notifications]
    return allNotifications.filter((item) => {
      const matchesCategory =
        category === 'All' ||
        (category === 'System' && ['schedule', 'lock'].includes(item.icon)) ||
        (category === 'Messages' && item.icon === 'person') ||
        (category === 'Smart Property' && item.icon === 'lock')

      return matchesCategory && (!unreadOnly || item.strong)
    })
  }, [category, liveNotifications, unreadOnly])

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
              <p className="mt-2 text-sm text-on-surface-variant">
                Realtime: {realtimeStatus === 'SUBSCRIBED' ? 'connected' : 'fallback feed'}
              </p>
              {dispatchStatus && (
                <p className="mt-2 text-sm text-on-surface-variant">{dispatchStatus}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-container p-2">
              <button
                onClick={sendTestNotification}
                className="rounded-md bg-secondary px-6 py-3 font-semibold text-on-secondary"
              >
                Send Test
              </button>
              <button
                onClick={() => setUnreadOnly(false)}
                className={`rounded-md px-6 py-3 ${
                  !unreadOnly ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant'
                }`}
              >
                All Notifications
              </button>
              <button
                onClick={() => setUnreadOnly(true)}
                className={`rounded-md px-6 py-3 ${
                  unreadOnly ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant'
                }`}
              >
                Unread Only
              </button>
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-4">
              {[
                ['All', 'inbox', notifications.length],
                ['System', 'grid_view', '12'],
                ['Messages', 'chat_bubble', '4'],
                ['Smart Property', 'monitoring', '2'],
              ].map(([label, icon, count]) => (
                <button
                  key={label}
                  onClick={() => setCategory(label)}
                  className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-6 text-left"
                >
                  <span className="flex items-center gap-4">
                    <span className={`material-symbols-outlined ${category === label ? 'text-secondary' : ''}`}>
                      {icon}
                    </span>
                    <span className={`font-semibold ${category === label ? 'text-secondary' : ''}`}>
                      {label}
                    </span>
                  </span>
                  <span className="rounded-full bg-secondary/20 px-3 py-1 text-secondary">
                    {count}
                  </span>
                </button>
              ))}
              <div className="rounded-lg border border-outline-variant bg-surface-container p-5">
                <h2 className="font-semibold">Preferences</h2>
                <DataBanner
                  className="mt-4"
                  variant={preferenceSource === 'supabase' ? 'info' : 'warning'}
                  title={
                    preferenceSource === 'supabase'
                      ? 'Preferences synced'
                      : 'Local preferences active'
                  }
                  description={
                    preferenceSource === 'supabase'
                      ? 'Notification preferences are saved to Supabase alert preferences.'
                      : 'Preferences are saved in this browser until the backend is reachable.'
                  }
                />
                <div className="mt-4 space-y-3">
                  {[
                    ['email', 'Email'],
                    ['sms', 'SMS'],
                    ['push', 'Push'],
                    ['smartAlerts', 'Smart alerts'],
                    ['leadAlerts', 'Lead alerts'],
                    ['listingReviews', 'Listing reviews'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-3">
                      <span className="text-sm text-on-surface-variant">
                        {label}
                        {savingPreference === key && ' saving...'}
                      </span>
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={() => updatePreference(key)}
                        className="h-4 w-4 accent-secondary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            <section className="space-y-5">
              {visibleNotifications.map((item) => (
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
              {visibleNotifications.length === 0 && (
                <div className="rounded-lg border border-outline-variant bg-surface-container p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-secondary">notifications_off</span>
                  <h2 className="mt-4 text-2xl font-semibold">No matching notifications</h2>
                  <p className="mt-2 text-on-surface-variant">
                    Change the category or unread filter to widen the list.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </EnterpriseShell>
  )
}
