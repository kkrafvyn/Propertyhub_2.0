import { categoryIcons } from './icons'

const categories = [
  { id: 'all', label: 'All homes' },
  { id: 'apartment', label: 'Apartments' },
  { id: 'house', label: 'Houses' },
  { id: 'office', label: 'Commercial' },
  { id: 'verified', label: 'Verified' },
]

export default function CategoryBar({ active, onChange }) {
  return (
    <div className="-mx-6 border-b border-surface-border px-6 lg:-mx-10 lg:px-10">
      <div className="flex gap-8 overflow-x-auto pb-0">
        {categories.map(({ id, label }) => {
          const Icon = categoryIcons[id]
          const isActive = active === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`category-chip ${isActive ? 'active' : ''}`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-brand-dark' : 'text-ink-secondary'}`} />
              <span className={`whitespace-nowrap text-xs font-medium ${isActive ? 'text-brand-dark' : 'text-ink-secondary'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
