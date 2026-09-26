import { useEffect, useRef, useState } from "react";
import { platformOperationsService, type HealthSnapshot } from "../../../lib/platform-operations.service";
import { ActivityFeed } from "../../components/admin/ActivityFeed";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function AdminOperations() {
  const [health,setHealth]=useState<HealthSnapshot|null>(null); const [events,setEvents]=useState<any[]>([]);
  const [healthError,setHealthError]=useState(""); const [eventsError,setEventsError]=useState("");
  const [busy,setBusy]=useState(false); const inFlight=useRef(false);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return ()=>window.clearInterval(timer);},[]);
  async function refresh() {
    if(inFlight.current)return; inFlight.current=true; setBusy(true); setHealthError("");setEventsError("");
    const [h,e]=await Promise.allSettled([platformOperationsService.checkHealth(),platformOperationsService.events()]);
    if(h.status==="fulfilled")setHealth(h.value); else setHealthError(h.reason?.message||"Health probe unavailable");
    if(e.status==="fulfilled")setEvents(e.value); else setEventsError(e.reason?.message||"Event feed unavailable");
    setBusy(false);inFlight.current=false;
  }
  useEffect(()=>{void refresh();},[]);
  return <div className="space-y-6">
    <Card className="p-6 space-y-4">
      <div className="flex justify-between gap-3"><div><h2 className="text-xl font-semibold">Platform operations</h2><p className="text-sm text-muted-foreground">Live API probes, app availability, queues and recorded errors.</p></div>
        <Button disabled={busy} onClick={()=>void refresh()}>{busy?"Checking…":"Run health checks"}</Button></div>
      {healthError&&<p role="alert" className="text-destructive">{healthError}. Previous results, if shown, are stale.</p>}
      {health&&<>
        <p className="text-xs text-muted-foreground">Last checked {new Date(health.checkedAt).toLocaleString()}{!health.recorded?" · Snapshot could not be saved":""}. These checks do not certify every user journey.</p>
        {now-Date.parse(health.checkedAt)>5*60*1000 && <p role="status" className="text-amber-700">This snapshot is over five minutes old. Run checks for current status.</p>}
        <div className="divide-y">{health.checks.map(check=><div key={check.name} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
          <strong className="text-sm">{check.name}</strong><span className={check.status==="failed"?"text-destructive":"text-muted-foreground"}>{check.status}{check.latencyMs!==undefined?` · ${check.latencyMs} ms`:""}</span>
          <p className="text-sm text-muted-foreground sm:col-span-2">{check.detail}</p>
        </div>)}</div>
        <p className="text-sm">{health.integrations.map(i=>`${i.name}: ${i.configured?"configured":"not configured"}`).join(" · ")}</p>
        <p className="text-xs text-muted-foreground">Integration configuration is not proof of provider availability or a successful transaction.</p>
      </>}
    </Card>
    <Card className="p-6 space-y-3"><h3 className="font-semibold">Recent service events</h3>
      {eventsError?<p role="alert" className="text-destructive">{eventsError}</p>:events.length?<div className="divide-y">{events.map(e=><div key={e.id} className="py-3 text-sm"><strong>{e.severity} · {e.service}</strong><p>{e.message}</p><time className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</time></div>)}</div>:<p className="text-sm text-muted-foreground">No events recorded.</p>}
    </Card>
    <Card className="p-6"><ActivityFeed /></Card>
  </div>;
}
