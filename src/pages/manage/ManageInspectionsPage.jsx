import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { fetchInspections, scheduleInspection } from '../../services/pms-service'

function Inspections() {
  const [inspections, setInspections] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ unit: '', type: 'Routine', date: '', inspector: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInspections().then(({ inspections: rows }) => setInspections(rows))
  }, [])

  async function handleSchedule() {
    if (!form.unit.trim()) return
    setLoading(true)
    const result = await scheduleInspection(form)
    if (result?.inspection) setInspections((prev) => [...prev, result.inspection])
    setShowForm(false)
    setForm({ unit: '', type: 'Routine', date: '', inspector: '' })
    setLoading(false)
  }

  return (
    <ManageShell titleKey="hubs.manage.inspections.title" subtitleKey="hubs.manage.inspections.subtitle">
      <div className="space-y-3">
        {inspections.map((insp) => (
          <article key={insp.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{insp.unit}</p>
              <p className="text-sm text-ink-secondary">{insp.type} · {insp.inspector} · {insp.date ?? insp.scheduled}</p>
            </div>
            <div className="flex items-center gap-3">
              {insp.score != null && <span className="font-bold text-ink">{insp.score}/100</span>}
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{insp.status}</span>
            </div>
          </article>
        ))}
      </div>
      <button type="button" onClick={() => setShowForm(true)} className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Schedule inspection</button>

      {showForm && (
        <QuickFormModal title="Schedule inspection" onClose={() => setShowForm(false)} onSubmit={handleSchedule} submitLabel="Schedule" loading={loading}>
          <ModalField label="Unit">
            <input className={modalInputClassName()} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </ModalField>
          <ModalField label="Type">
            <select className={modalInputClassName()} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option>Routine</option>
              <option>Move-in</option>
              <option>Move-out</option>
              <option>Quarterly</option>
            </select>
          </ModalField>
          <ModalField label="Date">
            <input type="date" className={modalInputClassName()} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </ModalField>
          <ModalField label="Inspector">
            <input className={modalInputClassName()} value={form.inspector} onChange={(e) => setForm((f) => ({ ...f, inspector: e.target.value }))} />
          </ModalField>
        </QuickFormModal>
      )}
    </ManageShell>
  )
}

export default function ManageInspectionsPage() {
  return <ProtectedRoute><Inspections /></ProtectedRoute>
}
