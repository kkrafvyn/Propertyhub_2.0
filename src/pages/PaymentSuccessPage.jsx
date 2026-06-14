import { Link, useSearchParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { IconCheck } from '../components/icons'
import { PageTitle, PrimaryButton, SecondaryButton } from '../components/ui/AirbnbUI'

export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const provider = params.get('provider') || 'payment'

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mx-auto max-w-lg py-12">
        <div className="panel-card px-8 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <IconCheck className="h-8 w-8" />
          </div>
          <PageTitle
            title="Payment successful"
            subtitle={`Your ${provider} payment was received. It may take a moment to reflect once webhooks process.`}
          />
          <div className="flex flex-wrap justify-center gap-3">
            <PrimaryButton as={Link} to="/trips">View trips</PrimaryButton>
            <SecondaryButton as={Link} to="/renter/payments">Renter payments</SecondaryButton>
            <SecondaryButton as={Link} to="/">Home</SecondaryButton>
          </div>
        </div>
      </div>
    </DesktopShell>
  )
}
