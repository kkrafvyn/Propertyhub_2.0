import { useEffect } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { IconClose } from '../icons'
import ConsumerMenuContent from '../consumer/ConsumerMenuContent'

export default function MobileHomeMenu({ open, onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40" role="dialog" aria-modal="true">
      <button type="button" className="flex-1" aria-label={t('common.close')} onClick={onClose} />
      <div className="flex h-full w-[min(100%,340px)] flex-col bg-bolt-bg shadow-xl">
        <header className="flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="text-lg font-bold text-ink">{t('mobile.menu')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-ink"
            aria-label={t('common.close')}
          >
            <IconClose className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ConsumerMenuContent onNavigate={onClose} showIntro />
        </div>
      </div>
    </div>
  )
}
