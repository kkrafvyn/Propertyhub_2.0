import { useEffect, useState } from 'react';
import { maintenanceService } from '../../../lib/maintenance.service';

export function MaintenancePhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setUrl(null); setFailed(false);
    void maintenanceService.getPhotoSignedUrl(path).then(signed => {
      if (active) { setUrl(signed); setFailed(!signed); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [path, attempt]);
  if (!url) return <div className="h-20 w-20 rounded-lg border border-border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
    {failed ? <button onClick={() => setAttempt(value => value + 1)}>Retry photo</button> : 'Loading photo…'}
  </div>;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Maintenance evidence"
    onError={() => { setUrl(null); setFailed(true); }} className="h-20 w-20 rounded-lg border border-border object-cover" /></a>;
}
