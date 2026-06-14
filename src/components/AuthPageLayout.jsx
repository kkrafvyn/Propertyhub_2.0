import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import DesktopShell from './DesktopShell'
import MobileShell from './MobileShell'
import LanguageSwitcher from './LanguageSwitcher'

function usePreferMobileShell() {
  const location = useLocation()
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setNarrow(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return location.pathname.startsWith('/m') || narrow
}

export default function AuthPageLayout({ children }) {
  const mobile = usePreferMobileShell()

  if (mobile) {
    return (
      <MobileShell hideNav>
        <div className="flex justify-end px-4 pt-4">
          <LanguageSwitcher />
        </div>
        <div className="px-4 py-2 pb-6">{children}</div>
      </MobileShell>
    )
  }

  return (
    <DesktopShell minimal>
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      {children}
    </DesktopShell>
  )
}
