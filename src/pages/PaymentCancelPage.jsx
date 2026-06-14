import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { PageTitle, PrimaryButton, SecondaryButton } from '../components/ui/AirbnbUI'

export default function PaymentCancelPage() {
  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mx-auto max-w-lg py-12">
        <div className="panel-card px-8 py-12 text-center">
          <PageTitle
            title="Payment cancelled"
            subtitle="No charge was made. You can try again anytime."
          />
          <div className="flex flex-wrap justify-center gap-3">
            <PrimaryButton as={Link} to="/finance">Finance hub</PrimaryButton>
            <SecondaryButton as={Link} to="/">Home</SecondaryButton>
          </div>
        </div>
      </div>
    </DesktopShell>
  )
}
