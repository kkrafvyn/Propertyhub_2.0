import { useEffect,useRef,useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { adminOperationsService } from '../../../lib/admin-operations.service';
import { SupportThread } from '../../components/security/SupportThread';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
export function SupportCases(){
 const {user}=useAuth();const [rows,setRows]=useState<Array<{id:string;subject:string;status:string}>>([]);const [selected,setSelected]=useState('');
 const [subject,setSubject]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [version,setVersion]=useState(0);const pending=useRef(false);
 useEffect(()=>{if(!user)return;let cancelled=false;setLoading(true);supabase.from('platform_support_cases').select('id,subject,status').eq('account_id',user.id).eq('category','support').order('updated_at',{ascending:false}).limit(100).then(({data,error})=>{if(cancelled)return;if(error)setError(error.message);else setRows(data||[]);setLoading(false);});return()=>{cancelled=true;};},[user?.id,version]);
 return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8"><header><a href="/app" className="text-sm text-primary underline">Back to your account</a><h1 className="mt-4 text-3xl font-semibold">Support conversations</h1><p className="mt-2 text-sm text-muted-foreground">Contact the team and follow your requests.</p></header>{error?<p role="alert" className="text-destructive">{error}</p>:null}
 <Card className="space-y-3 p-5"><h2 className="font-semibold">Your recent cases</h2>{loading?<p role="status">Loading cases…</p>:rows.length?<ul className="space-y-2">{rows.map(row=><li key={row.id}><Button variant="outline" className="h-auto w-full justify-between text-left" onClick={()=>setSelected(row.id)}>{row.subject} · {row.status.replaceAll('_',' ')}</Button></li>)}</ul>:<p className="text-sm text-muted-foreground">You have no support conversations yet.</p>}<Button variant="ghost" onClick={()=>{setError('');setVersion(v=>v+1);}}>Refresh cases</Button></Card>
 {selected?<Card className="p-5"><SupportThread key={selected} caseId={selected} onChanged={()=>setVersion(v=>v+1)}/></Card>:null}
 <Card className="p-5"><form className="space-y-4" onSubmit={async event=>{event.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const id=await adminOperationsService.createCustomerCase(subject,message);setSelected(String(id));setSubject('');setMessage('');setVersion(v=>v+1);}catch(error){setError(error instanceof Error?error.message:'Unable to contact support.');}finally{pending.current=false;setBusy(false);}}}><h2 className="font-semibold">Start a conversation</h2><Input label="Subject" required minLength={3} maxLength={200} value={subject} onChange={event=>setSubject(event.target.value)} disabled={busy}/><label className="block text-sm">How can we help?<textarea required minLength={10} maxLength={4000} className="mt-2 block min-h-28 w-full rounded-lg border border-border bg-background p-3" value={message} onChange={event=>setMessage(event.target.value)} disabled={busy}/></label><Button type="submit" disabled={busy}>Create support case</Button></form></Card>
 </main>;
}
