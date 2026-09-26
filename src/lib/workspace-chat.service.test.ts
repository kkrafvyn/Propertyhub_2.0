import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc }=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('./supabase',()=>({supabase:{rpc}}));
vi.mock('./workspace-tasks.service',()=>({workspaceTasksService:{}}));
vi.mock('./dealcase.service',()=>({dealCaseService:{}}));
import { workspaceChatService } from './workspace-chat.service';
describe('workspace chat',()=>{
  beforeEach(()=>rpc.mockReset());
  it('displays the newest page chronologically and exposes a stable older cursor',async()=>{
    const rows=Array.from({length:81},(_,i)=>({id:String(100-i),created_at:'2026-09-24T10:00:00Z',content:String(100-i)}));
    rpc.mockResolvedValue({data:rows,error:null});
    const page=await workspaceChatService.listMessagePage('conversation');
    expect(page.messages[0].id).toBe('21');expect(page.messages.at(-1)?.id).toBe('100');
    expect(page.olderCursor).toEqual({id:'21',createdAt:rows[0].created_at});
    await workspaceChatService.listMessagePage('conversation',{before:page.olderCursor});
    expect(rpc).toHaveBeenLastCalledWith('list_workspace_messages',expect.objectContaining({p_before_id:'21',p_before_created_at:rows[0].created_at}));
  });
  it('creates channels through one checked transaction and propagates participant failure',async()=>{
    rpc.mockResolvedValue({error:new Error('Participant insertion failed')});
    await expect(workspaceChatService.createChannel({organizationId:'org',createdBy:'spoofable-client-id',slug:'General',name:'General'})).rejects.toThrow('Participant');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('create_workspace_channel',expect.not.objectContaining({created_by:'spoofable-client-id'}));
  });
  it('uses server identity for direct-message lookup/create',async()=>{
    rpc.mockResolvedValue({data:'same-thread',error:null});
    expect(await workspaceChatService.openDirectMessage({organizationId:'org',currentUserId:'ignored',otherUserId:'peer'})).toBe('same-thread');
    expect(rpc).toHaveBeenCalledWith('open_workspace_direct_message',{p_organization_id:'org',p_other_user_id:'peer'});
  });
});
