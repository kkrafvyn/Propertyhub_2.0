import { useState } from 'react'
import { useTranslation } from '../i18n/LocaleContext'

export default function ShareListingButton({ listing }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  if (!listing) return null

  const url = `${window.location.origin}/property/${listing.id}`
  const text = `${listing.title} — ${listing.location}`

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text, url })
        return
      } catch { /* fall through */ }
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
    window.open(wa, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold hover:bg-surface-hover">
        {t('share.whatsapp')}
      </button>
      <button type="button" onClick={copyLink} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold hover:bg-surface-hover">
        {copied ? t('share.copied') : t('share.copyLink')}
      </button>
    </div>
  )
}
