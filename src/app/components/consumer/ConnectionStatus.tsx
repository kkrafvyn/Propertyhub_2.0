import { useEffect, useState } from 'react';
export function ConnectionStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return online ? null : <div role="alert" className="border-b border-surface-border bg-surface px-4 py-3 text-center text-sm text-ink">You’re offline. Text drafts stay in this tab. Reconnect and retry; keep this page open to retain selected upload files.</div>;
}
