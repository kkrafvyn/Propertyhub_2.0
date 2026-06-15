import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { IconCheck } from '../../components/icons'

const steps = [
  { id: 1, label: 'Company details', done: true },
  { id: 2, label: 'License upload', done: true },
  { id: 3, label: 'Team setup', done: false },
  { id: 4, label: 'Verification review', done: false },
]

export default function AgencyOnboardingPage() {
  return (
    <ProtectedRoute>
      <AgencyShell titleKey="hubs.agency.onboarding.title" subtitleKey="hubs.agency.onboarding.subtitle">
        <div className="max-w-xl space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-4 panel-card bg-surface p-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step.done ? 'bg-brand-accent text-white' : 'bg-surface-subtle text-ink-secondary'
              }`}>
                {step.done ? <IconCheck className="h-4 w-4" /> : step.id}
              </span>
              <span className="font-medium">{step.label}</span>
            </div>
          ))}
        </div>
      </AgencyShell>
    </ProtectedRoute>
  )
}
