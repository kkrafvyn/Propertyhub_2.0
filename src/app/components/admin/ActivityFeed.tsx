import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { platformOperationsService } from "../../../lib/platform-operations.service";
import { Button } from "../ui/Button";

export function ActivityFeed({organizationId,department}:{organizationId?:string;department?:string}) {
  const [rows,setRows]=useState<any[]>([]); const [error,setError]=useState("");
  const [loading,setLoading]=useState(false); const [page,setPage]=useState<number|undefined>();
  const [entity,setEntity]=useState(""); const [revision,setRevision]=useState(0);
  useEffect(()=>{setPage(undefined);},[organizationId,department,entity]);
  useEffect(()=>{
    let cancelled=false; setLoading(true); setError("");
    void platformOperationsService.activity({organizationId,department,entity,before:page})
      .then(data=>{if(!cancelled)setRows(data);})
      .catch(err=>{if(!cancelled){setRows([]);setError(err.message||"Unable to load activity");}})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[organizationId,department,page,entity,revision]);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="font-semibold">Recorded activity</h3>
      <label className="text-sm">Area <NativeSelectControl className="rounded border bg-background p-2" value={entity} onChange={e=>setEntity(e.target.value)}>
        <option value="">All recorded areas</option>
        {["users","organizations","organization_members","organization_departments","listings","deal_cases","leases","transactions","workspace_tasks","maintenance_requests"].map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}
      </NativeSelectControl></label>
      <Button variant="outline" size="sm" disabled={loading} onClick={()=>{setPage(undefined);setRevision(v=>v+1);}}>Latest activity</Button>
    </div>
    <p className="text-xs text-muted-foreground">Database changes recorded since activity tracking was deployed. Newest first; 50 per page. Historical changes and uninstrumented external services are not reconstructed.</p>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    {loading?<p>Loading activity…</p>:rows.length?<div className="divide-y rounded border">
      {rows.map(row=><div key={row.id} className="p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{row.action} · {row.entity_type.replaceAll("_"," ")}</strong><time>{new Date(row.created_at).toLocaleString()}</time></div>
        <p className="break-all text-xs text-muted-foreground">Record {row.entity_id||"—"} · Actor {row.actor_id||"System"}{row.organization_id?` · Organization ${row.organization_id}`:""}{row.department_key?` · ${row.department_key}`:""}</p>
      </div>)}
    </div>:!error?<p className="text-sm text-muted-foreground">No recorded activity in this selection.</p>:null}
    {rows.length===50&&<Button variant="outline" disabled={loading} onClick={()=>setPage(rows.at(-1).id)}>Older activity</Button>}
  </section>;
}
