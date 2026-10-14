import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { AdminSectionGate } from './AdminSectionGate';
import { appRoleService, type AppRole, type AppRoleUser } from '../../../lib/app-roles.service';
import { PLATFORM_CONSOLE_GRANT_ORDER, PLATFORM_CONSOLE_GRANT_LABELS, type PlatformConsoleGrant } from '../../../lib/platform-console-grants';

const controlClass='w-full rounded-lg border border-border bg-background px-3 py-2';
const emptyRole = () => ({ id: null as string | null, name: '', description: '', grants: [] as PlatformConsoleGrant[], revision: 0 });
export function AdminAppRoles() { return <AdminSectionGate section="roles" label="App roles"><AppRolesManager /></AdminSectionGate>; }
export function AppRolesManager() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [users, setUsers] = useState<AppRoleUser[]>([]);
  const [draft, setDraft] = useState(emptyRole);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<AppRole | null>(null);
  const showError=(err: unknown) => setError(err instanceof Error ? err.message : 'The app role operation failed. Reload and try again.');
  const load = async () => {
    setBusy(true); setError('');
    try { const [nextRoles,nextUsers] = await Promise.all([appRoleService.list(),appRoleService.users(email)]); setRoles(nextRoles); setUsers(nextUsers); }
    catch(err) {showError(err);} finally {setBusy(false);}
  };
  useEffect(() => {void load();}, []);
  const save = async () => {
    setBusy(true); setError('');
    try { await appRoleService.save(draft); setDraft(emptyRole()); await load(); toast.success('App role saved. Assigned users now have the updated permissions.'); }
    catch(err) {showError(err);} finally {setBusy(false);}
  };
  const assign = async () => {
    setBusy(true); setError('');
    try { await appRoleService.assign(userId,roleId || null); await load(); toast.success(roleId ? 'App role assigned.' : 'App role removed.'); }
    catch(err) {showError(err);} finally {setBusy(false);}
  };
  const remove = async () => {
    if(!deleting) return; setBusy(true); setError('');
    try {await appRoleService.remove(deleting.id,deleting.revision); setDeleting(null); setDraft(emptyRole()); await load(); toast.success('App role deleted.');}
    catch(err) {showError(err);} finally {setBusy(false);}
  };
  const selectedUser=users.find(item => item.id===userId);
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">App roles</h1><p className="text-muted-foreground mt-2">Create reusable roles for the app admin console and assign them to users. These roles are separate from organization membership and workspace roles.</p></div>
    {error && <Card className="p-4"><p role="alert">{error}</p><Button variant="outline" disabled={busy} onClick={() => void load()} className="mt-2">Reload app roles</Button></Card>}
    <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">{draft.id ? 'Edit app role' : 'Create app role'}</h2>
      <fieldset disabled={busy} className="space-y-4 min-w-0">
        <label className="block space-y-1"><span className="text-sm font-medium">Role name</span><input className={controlClass} maxLength={80} value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})} /></label>
        <label className="block space-y-1"><span className="text-sm font-medium">Role description</span><textarea className={controlClass} maxLength={500} value={draft.description} onChange={e => setDraft({...draft,description:e.target.value})} /></label>
        <div className="grid sm:grid-cols-2 gap-3" role="group" aria-label="App permissions">{PLATFORM_CONSOLE_GRANT_ORDER.map(grant => <label key={grant} className="flex gap-2 items-center border rounded-lg p-3"><input type="checkbox" checked={draft.grants.includes(grant)} onChange={e => setDraft({...draft,grants:e.target.checked ? [...draft.grants,grant] : draft.grants.filter(item => item!==grant)})} />{PLATFORM_CONSOLE_GRANT_LABELS[grant]}</label>)}</div>
        <p className="text-sm text-muted-foreground">Editing a role updates every user assigned to it. Full platform-admin access, role creation, and marketing publishing remain reserved for platform admins.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={draft.name.trim().length<2 || draft.grants.length===0} onClick={() => void save()}>{draft.id ? 'Save role changes' : 'Create role'}</Button>{draft.id && <Button variant="outline" onClick={() => setDraft(emptyRole())}>Cancel edit</Button>}</div>
      </fieldset>
    </Card>
    <Card className="p-6 space-y-3"><h2 className="text-xl font-semibold">Saved app roles</h2>{busy && <p role="status">Updating roles…</p>}{!roles.length && !busy && <p className="text-muted-foreground">No custom app roles yet.</p>}{roles.map(role => <article key={role.id} className="border rounded-lg p-4 space-y-2"><h3 className="font-semibold">{role.name}</h3><p className="text-sm text-muted-foreground">{role.description}</p><p className="text-sm">{role.grants.map(grant=>PLATFORM_CONSOLE_GRANT_LABELS[grant]).join(', ')}</p><div className="flex gap-2"><Button variant="outline" disabled={busy} aria-label={`Edit ${role.name}`} onClick={() => setDraft({...role,grants:[...role.grants]})}>Edit</Button><Button variant="outline" disabled={busy} aria-label={`Delete ${role.name}`} onClick={() => setDeleting(role)}>Delete</Button></div></article>)}</Card>
    <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">Assign roles to app users</h2><p className="text-sm text-muted-foreground">Assigning a named role replaces the user's current direct platform grants. Removing it revokes those grants. Their organization roles are unchanged.</p>
      <fieldset disabled={busy} className="space-y-4 min-w-0"><label className="block space-y-1"><span className="text-sm font-medium">Find user by email</span><input className={controlClass} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Search all app users by email" /></label><Button variant="outline" onClick={() => {setUserId('');setRoleId('');void load();}}>Search users</Button>
        <label className="block space-y-1"><span className="text-sm font-medium">App user</span><select className={controlClass} value={userId} onChange={e=>{setUserId(e.target.value);setRoleId(users.find(item=>item.id===e.target.value)?.platform_role_id || '');}}><option value="">Choose a user</option>{users.map(item=><option key={item.id} value={item.id} disabled={item.is_platform_admin || item.id===user?.id}>{item.full_name || item.email || item.id}{item.email && item.full_name ? ` (${item.email})` : ''}{item.is_platform_admin ? ' — platform admin' : ''}</option>)}</select></label>
        {selectedUser && <p className="text-sm">Current named role: {roles.find(item=>item.id===selectedUser.platform_role_id)?.name || 'None'}</p>}
        <label className="block space-y-1"><span className="text-sm font-medium">Assign app role</span><select className={controlClass} value={roleId} onChange={e=>setRoleId(e.target.value)}><option value="">Remove named app role</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        <Button disabled={!userId || (!roleId && !selectedUser?.platform_role_id)} onClick={()=>void assign()}>Apply app role</Button>
      </fieldset>
    </Card>
    <Dialog open={Boolean(deleting)} onOpenChange={open=>{if(!open)setDeleting(null);}}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.name}?</DialogTitle><DialogDescription>Only unassigned roles can be deleted. Remove any user assignments first.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setDeleting(null)}>Cancel</Button><Button disabled={busy} onClick={()=>void remove()}>Delete role</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
