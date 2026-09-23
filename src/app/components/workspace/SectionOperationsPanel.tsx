import { useEffect, useState } from "react";
import { platformOperationsService } from "../../../lib/platform-operations.service";
import { workspaceTasksService } from "../../../lib/workspace-tasks.service";
import { ActivityFeed } from "../admin/ActivityFeed";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function SectionOperationsPanel({organizationId}:{organizationId:string}) {
  const [scope,setScope]=useState<{organizationAdmin:boolean;departments:Array<{key:string;name:string}>}|null>(null);
  const [department,setDepartment]=useState(""); const [tasks,setTasks]=useState<any[]>([]);
  const [error,setError]=useState(""); const [working,setWorking]=useState<string|null>(null);
  useEffect(()=>{
    let cancelled=false;setScope(null);setError("");setTasks([]);
    void platformOperationsService.sections(organizationId).then(async result=>{
      if(cancelled)return;setScope(result);setDepartment(result.organizationAdmin?"":result.departments[0]?.key||"");
      if(result.organizationAdmin||result.departments.length){
        const rows=await workspaceTasksService.getOrganizationTasks(organizationId);
        if(!cancelled)setTasks(rows);
      }
    }).catch(err=>{if(!cancelled)setError(err.message||"Unable to load section controls");});
    return()=>{cancelled=true;};
  },[organizationId]);
  if(!scope||(!scope.organizationAdmin&&!scope.departments.length))return error?<p role="alert">{error}</p>:null;
  async function update(id:string,status:"completed"|"in_progress") {
    setWorking(id);setError("");
    try {await workspaceTasksService.updateTaskStatus(id,status);setTasks(await workspaceTasksService.getOrganizationTasks(organizationId));}
    catch(err){setError((err as Error).message||"Unable to update task");}
    finally{setWorking(null);}
  }
  const open=tasks.filter(t=>["open","in_progress"].includes(t.status));
  return <Card className="p-6 space-y-5">
    <div><h2 className="text-lg font-semibold">{scope.organizationAdmin?"Organization control":"Department control"}</h2>
      <p className="text-sm text-muted-foreground">Manage authorized tasks and review activity within your section. Account blocking and deletion remain platform-admin actions.</p></div>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    <section className="space-y-2"><h3 className="font-semibold">Open tasks in your authorized sections ({open.length})</h3>
      {open.slice(0,20).map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"><span>{t.title} · {t.status}</span><div className="flex gap-2">
        {t.status==="open"&&<Button size="sm" variant="outline" disabled={Boolean(working)} onClick={()=>void update(t.id,"in_progress")}>Start</Button>}
        <Button size="sm" variant="outline" disabled={Boolean(working)} onClick={()=>void update(t.id,"completed")}>Complete</Button>
      </div></div>)}
      {!open.length&&<p className="text-sm text-muted-foreground">No open tasks in your authorized sections.</p>}
      {open.length>20&&<p className="text-xs text-muted-foreground">Showing the first 20. Open the task workspace for the complete list.</p>}
    </section>
    <label className="block text-sm">Activity scope <select className="ml-2 rounded border bg-background p-2" value={department} onChange={e=>setDepartment(e.target.value)}>
      {scope.organizationAdmin&&<option value="">Entire organization</option>}
      {scope.departments.map(d=><option key={d.key} value={d.key}>{d.name}</option>)}
    </select></label>
    <ActivityFeed organizationId={organizationId} department={department||undefined}/>
  </Card>;
}
