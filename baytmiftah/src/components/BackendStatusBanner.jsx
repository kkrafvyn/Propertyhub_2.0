import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DataBanner } from './UI'

export default function BackendStatusBanner({ className = '' }) {
  const [status, setStatus] = useState(() =>
    navigator.onLine ? 'checking' : 'offline'
  )

  useEffect(() => {
    let ignore = false

    async function checkConnection() {
      if (!navigator.onLine) {
        setStatus('offline')
        return
      }

      const { error } = await supabase.auth.getSession()
      if (!ignore) setStatus(error ? 'demo' : 'connected')
    }

    checkConnection()

    const handleOnline = () => checkConnection()
    const handleOffline = () => setStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      ignore = true
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (status === 'connected' || status === 'checking') return null

  return (
    <DataBanner
      className={className}
      variant="warning"
      title={status === 'offline' ? 'Offline mode active' : 'Demo mode active'}
      description={
        status === 'offline'
          ? 'The browser is offline. Changes are staged locally until the connection returns.'
          : 'Supabase is not fully reachable for this session, so some screens use fallback data and retry controls.'
      }
    />
  )
}
