import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { requestPushPermission } from '../services/push-service'
import { useTranslation } from '../i18n/LocaleContext'

const DISMISS_KEY = 'baytmiftah_push_dismissed'

export default function PushPrompt() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || localStorage.getItem(DISMISS_KEY)) return
    if (Notification.permission === 'granted') return

    supabase?.auth.getSession().then(({ data }) => {
      if (data.session) setVisible(true)
    })
  }, [])

  async function enable() {
    setLoading(true)
    await requestPushPermission()
    setVisible(false)
    setLoading(false)
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 end-4 z-50 max-w-sm rounded-xl border border-surface-border bg-surface p-4 shadow-card">
      <p className="text-sm font-semibold">{t('extensions.push.title')}</p>
      <p className="mt-1 text-xs text-ink-secondary">{t('extensions.push.body')}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={enable} disabled={loading} className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {loading ? t('extensions.push.enabling') : t('extensions.push.enable')}
        </button>
        <button type="button" onClick={dismiss} className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold">
          {t('extensions.push.later')}
        </button>
      </div>
    </div>
  )
}
