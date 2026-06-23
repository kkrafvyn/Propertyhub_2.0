import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  EXPLORE_AMENITIES,
  EXPLORE_AREAS,
  EXPLORE_AVAILABILITY,
  EXPLORE_CITIES,
  EXPLORE_LISTING_TYPES,
  EXPLORE_PROPERTY_TYPES,
  EXPLORE_REGIONS,
  EXPLORE_SORT_OPTIONS,
  applyExploreFilters,
  defaultExploreFilters,
} from '../../lib/explore-filters'

function Section({ title, children, highlight = false }) {
  return (
    <section className={`mb-6 ${highlight ? 'rounded-xl border border-mobile-forest/25 bg-mobile-forest/5 p-4' : ''}`}>
      <h3 className={`mb-3 text-xs font-bold uppercase tracking-wide ${highlight ? 'text-mobile-forest' : 'text-ink-secondary'}`}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-mobile-forest bg-mobile-forest text-white'
          : 'border-surface-border bg-surface text-ink-secondary hover:border-mobile-forest/40'
      }`}
    >
      {children}
    </button>
  )
}

function ChipGrid({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-mobile-forest"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 py-2">
      <div>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-secondary">{description}</span>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-surface-border accent-mobile-forest"
      />
    </label>
  )
}

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export default function MobileExploreFiltersSheet({
  open,
  onClose,
  filters,
  onApply,
  listings = [],
  search = '',
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const previewCount = useMemo(() => {
    let rows = applyExploreFilters(listings, draft)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((l) =>
        `${l.title} ${l.type} ${l.location || ''} ${l.area || ''}`.toLowerCase().includes(q),
      )
    }
    return rows.length
  }, [draft, listings, search])

  if (!open) return null

  function patch(updates) {
    setDraft((prev) => ({ ...prev, ...updates }))
  }

  function togglePropertyType(id) {
    patch({ propertyTypes: toggleInList(draft.propertyTypes, id) })
  }

  function toggleAmenity(id) {
    patch({ amenities: toggleInList(draft.amenities, id) })
  }

  function handleReset() {
    setDraft(defaultExploreFilters())
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  const bedroomOptions = [0, 1, 2, 3, 4, 5]
  const bathroomOptions = [0, 1, 2, 3, 4]
  const priceCeiling = 10_000_000

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45" role="dialog" aria-modal="true">
      <div className="flex h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{t('exploreFilters.title')}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-ink-secondary">
            {t('common.close')}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Section title={t('exploreFilters.propertyType')}>
            <ChipGrid>
              {EXPLORE_PROPERTY_TYPES.map((id) => (
                <Chip
                  key={id}
                  active={draft.propertyTypes.includes(id)}
                  onClick={() => togglePropertyType(id)}
                >
                  {t(`exploreFilters.propertyTypes.${id}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title={t('exploreFilters.listingType')}>
            <ChipGrid>
              {EXPLORE_LISTING_TYPES.map((id) => (
                <Chip
                  key={id}
                  active={draft.listingType === id}
                  onClick={() => patch({ listingType: draft.listingType === id ? '' : id })}
                >
                  {t(`exploreFilters.listingTypes.${id}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title={t('exploreFilters.location')}>
            <div className="space-y-3">
              <SelectField
                label={t('exploreFilters.region')}
                value={draft.region}
                onChange={(region) => patch({ region })}
                options={[
                  { value: '', label: t('exploreFilters.anyLocation') },
                  ...EXPLORE_REGIONS.map((r) => ({ value: r, label: r })),
                ]}
              />
              <SelectField
                label={t('exploreFilters.city')}
                value={draft.city}
                onChange={(city) => patch({ city })}
                options={[
                  { value: '', label: t('exploreFilters.anyLocation') },
                  ...EXPLORE_CITIES.map((c) => ({ value: c, label: c })),
                ]}
              />
              <SelectField
                label={t('exploreFilters.area')}
                value={draft.area}
                onChange={(area) => patch({ area })}
                options={[
                  { value: '', label: t('exploreFilters.anyLocation') },
                  ...EXPLORE_AREAS.map((a) => ({ value: a, label: a })),
                ]}
              />
            </div>
          </Section>

          <Section title={t('exploreFilters.priceRange')}>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1.5 block font-medium text-ink">{t('exploreFilters.minPrice')}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={draft.minPrice}
                  onChange={(e) => patch({ minPrice: e.target.value })}
                  className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-mobile-forest"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block font-medium text-ink">{t('exploreFilters.maxPrice')}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={t('exploreFilters.noMax')}
                  value={draft.maxPrice}
                  onChange={(e) => patch({ maxPrice: e.target.value })}
                  className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-mobile-forest"
                />
              </label>
            </div>
            <div className="mt-4 space-y-2">
              <input
                type="range"
                min={0}
                max={priceCeiling}
                step={50000}
                value={draft.minPrice === '' ? 0 : Number(draft.minPrice)}
                onChange={(e) => patch({ minPrice: e.target.value })}
                className="w-full accent-mobile-forest"
                aria-label={t('exploreFilters.minPrice')}
              />
              <input
                type="range"
                min={0}
                max={priceCeiling}
                step={50000}
                value={draft.maxPrice === '' ? priceCeiling : Number(draft.maxPrice)}
                onChange={(e) => patch({ maxPrice: e.target.value })}
                className="w-full accent-mobile-forest"
                aria-label={t('exploreFilters.maxPrice')}
              />
            </div>
          </Section>

          <Section title={t('exploreFilters.bedrooms')}>
            <ChipGrid>
              {bedroomOptions.map((n) => (
                <Chip
                  key={n}
                  active={draft.minBedrooms === n}
                  onClick={() => patch({ minBedrooms: n })}
                >
                  {n === 0 ? t('filters.any') : `${n}+`}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title={t('exploreFilters.bathrooms')}>
            <ChipGrid>
              {bathroomOptions.map((n) => (
                <Chip
                  key={n}
                  active={draft.minBathrooms === n}
                  onClick={() => patch({ minBathrooms: n })}
                >
                  {n === 0 ? t('filters.any') : `${n}+`}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title={t('exploreFilters.verification')} highlight>
            <div className="divide-y divide-mobile-forest/10">
              <ToggleRow
                label={t('exploreFilters.verifiedProperties')}
                description={t('exploreFilters.verifiedPropertiesHint')}
                checked={draft.verifiedPropertiesOnly}
                onChange={(verifiedPropertiesOnly) => patch({ verifiedPropertiesOnly })}
              />
              <ToggleRow
                label={t('exploreFilters.verifiedAgents')}
                description={t('exploreFilters.verifiedAgentsHint')}
                checked={draft.verifiedAgentsOnly}
                onChange={(verifiedAgentsOnly) => patch({ verifiedAgentsOnly })}
              />
              <ToggleRow
                label={t('exploreFilters.verifiedAgencies')}
                description={t('exploreFilters.verifiedAgenciesHint')}
                checked={draft.verifiedAgenciesOnly}
                onChange={(verifiedAgenciesOnly) => patch({ verifiedAgenciesOnly })}
              />
            </div>
          </Section>

          <Section title={t('exploreFilters.availability')}>
            <ChipGrid>
              {EXPLORE_AVAILABILITY.map((id) => (
                <Chip
                  key={id}
                  active={draft.availability === id}
                  onClick={() => patch({ availability: draft.availability === id ? '' : id })}
                >
                  {t(`exploreFilters.availabilityOptions.${id}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title={t('exploreFilters.amenities')}>
            <ChipGrid>
              {EXPLORE_AMENITIES.map((id) => (
                <Chip
                  key={id}
                  active={draft.amenities.includes(id)}
                  onClick={() => toggleAmenity(id)}
                >
                  {t(`exploreFilters.amenityOptions.${id}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title={t('exploreFilters.sortBy')}>
            <ChipGrid>
              {EXPLORE_SORT_OPTIONS.map((id) => (
                <Chip
                  key={id}
                  active={draft.sortBy === id}
                  onClick={() => patch({ sortBy: id })}
                >
                  {t(`exploreFilters.sortOptions.${id}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>
        </div>

        <div className="shrink-0 border-t border-surface-border bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-surface-border py-3.5 text-sm font-semibold text-ink"
            >
              {t('exploreFilters.reset')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-mobile-forest py-3.5 text-sm font-semibold text-white shadow-sm"
            >
              {t('exploreFilters.showResults', { count: previewCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
