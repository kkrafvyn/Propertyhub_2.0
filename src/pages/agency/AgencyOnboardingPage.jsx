import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'

const steps = [
  { id: 1, label: 'Company details', done: true },
  { id: 2, label: 'License upload', done: true },
  { id: 3, label: 'Team setup', done: false },
  { id: 4, label: 'Verification review', done: false },
]

export default function AgencyOnboardingPage() {
  return (
    <ProtectedRoute>
      <AgencyShell title="Onboarding" subtitle="Complete verification to unlock enterprise tools">
        <div className="max-w-xl space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-4 rounded-card border border-surface-border bg-surface p-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step.done ? 'bg-brand-dark text-brand' : 'bg-surface-subtle text-ink-secondary'
              }`}>
                {step.done ? '✓' : step.id}
              </span>
              <span className="font-medium">{step.label}</span>
            </div>
          ))}
        </div>
      </AgencyShell>
    </ProtectedRoute>
  )
}
