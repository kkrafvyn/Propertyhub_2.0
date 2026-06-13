import { useEffect, useState } from 'react'
import { probeBackendConnection } from '../lib/supabase-db'

export default function BackendBanner() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    probeBackendConnection().then(setStatus)
  }, [])

  if (!status || status.mode === 'live') return null

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {status.mode === 'offline' && (
        <p>
          <strong>Offline mode.</strong> Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> to `.env`, then run{' '}
          <code className="text-xs">.\scripts\deploy-supabase.ps1</code>.
        </p>
      )}
      {status.mode === 'empty' && (
        <p>
          <strong>Database connected.</strong> Apply migrations:{' '}
          <code className="text-xs">npm run db:apply</code> or{' '}
          <code className="text-xs">npm run supabase:link</code> (add <code className="text-xs">SUPABASE_DB_PASSWORD</code> to .env).
        </p>
      )}
      {status.mode === 'error' && (
        <p><strong>Backend error:</strong> {status.message}</p>
      )}
    </div>
  )
}
