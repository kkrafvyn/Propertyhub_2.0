import { useEffect, useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '../icons'
import { useTranslation } from '../../../i18n/LocaleContext'

export default function MobilePhotoGallery({ photos, title, open, initialIndex = 0, onClose }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef(null)

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !photos?.length) return null

  function go(delta) {
    setIndex((i) => (i + delta + photos.length) % photos.length)
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
        >
          {t('common.close')}
        </button>
        <span className="text-sm text-white/80">
          {index + 1} / {photos.length}
        </span>
      </div>
      <div
        className="relative flex flex-1 items-center justify-center"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return
          const dx = e.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchStartX.current = null
        }}
      >
        <img
          src={photos[index]}
          alt={title}
          className="max-h-full max-w-full object-contain"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 rounded-full bg-white/20 p-2 text-white"
              aria-label="Previous"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 rounded-full bg-white/20 p-2 text-white"
              aria-label="Next"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
