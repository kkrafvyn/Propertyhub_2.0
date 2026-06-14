import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchNotifications, markNotificationRead } from '../services/notification-service'

export default function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  useEffect(() => {
    fetchNotifications().then(({ notifications }) => setItems(notifications))
  }, [])

  const unread = items.filter((n) => !n.read).length

  async function handleRead(id, link) {
    await markNotificationRead(id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    if (link) window.location.href = link
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 hover:bg-surface-hover"
        aria-label={t('notifications.title')}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 rounded-xl border border-surface-border bg-surface shadow-card">
          <p className="border-b border-surface-border px-4 py-3 text-sm font-semibold">{t('notifications.title')}</p>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-ink-secondary">{t('notifications.empty')}</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => { handleRead(n.id, n.link); setOpen(false) }}
                    className={`block w-full px-4 py-3 text-start text-sm hover:bg-surface-hover ${n.read ? 'text-ink-secondary' : 'font-medium text-ink'}`}
                  >
                    <p>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-ink-secondary">{n.body}</p>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
