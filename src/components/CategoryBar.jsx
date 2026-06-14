import { categoryIcons, IconMap, IconSliders } from './icons'
import { useTranslation } from '../i18n/LocaleContext'

const categoryIds = ['all', 'apartment', 'house', 'office', 'verified']

export default function CategoryBar({
  active,
  onChange,
  onFiltersClick,
  mapMode = false,
  onToggleMap,
  showMapToggle = true,
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-4">
      <div className="listing-scroll min-w-0 flex-1">
        {categoryIds.map((id) => {
          const Icon = categoryIcons[id]
          const isActive = active === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`category-chip ${isActive ? 'active' : ''}`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-ink' : 'text-ink-secondary'}`} />
              <span className={`whitespace-nowrap text-xs font-medium ${isActive ? 'text-ink' : 'text-ink-secondary'}`}>
                {t(`categories.${id}`)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-s border-surface-border ps-4">
        {onFiltersClick && (
          <button type="button" onClick={onFiltersClick} className="filter-chip">
            <IconSliders />
            {t('categories.filters')}
          </button>
        )}
        {showMapToggle && onToggleMap && (
          <button
            type="button"
            onClick={onToggleMap}
            className={`filter-chip ${mapMode ? 'bg-ink text-white hover:bg-ink/90' : ''}`}
          >
            <IconMap />
            {mapMode ? t('categories.showList') : t('categories.showMap')}
          </button>
        )}
      </div>
    </div>
  )
}
