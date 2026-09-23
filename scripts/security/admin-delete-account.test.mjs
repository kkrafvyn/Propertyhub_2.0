import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), createAdmin: vi.fn(), rpc: vi.fn(), lookup: vi.fn(), remove: vi.fn() }));
vi.mock('../../supabase/functions/_shared/supabase.ts', () => ({
  requireAuthenticatedUser: mocks.authenticate,
  createAdminClient: mocks.createAdmin,
}));
vi.mock('../../supabase/functions/_shared/http.ts', () => {
  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  return {
    HttpError, getCorsHeaders: () => ({}),
    jsonResponse: (status, body) => new Response(JSON.stringify(body), { status }),
    safeErrorMessage: (error, fallback) => error instanceof HttpError ? error.message : fallback,
  };
});
let handler;
const id = '00000000-0000-0000-0000-000000000003';
const request = (confirmation = id) => new Request('https://example.test/admin-delete-account', {
  method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ userId: id, confirmation }),
});
beforeAll(async () => {
  vi.stubGlobal('Deno', { serve: (fn) => { handler = fn; } });
  await import('../../supabase/functions/admin-delete-account/index.ts');
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue({ userClient: { rpc: mocks.rpc } });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.createAdmin.mockReturnValue({ auth: { admin: { getUserById: mocks.lookup, deleteUser: mocks.remove } } });
  mocks.lookup.mockResolvedValue({ data: { user: { id } }, error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
describe('admin deletion endpoint', () => {
  it('does not reach privileged Auth APIs when database authorization fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'Only an active platform admin can manage accounts' } });
    const result = await handler(request());
    expect(result.status).toBe(403); expect(mocks.createAdmin).not.toHaveBeenCalled();
  });
  it('rejects a mismatched confirmation without any mutation', async () => {
    expect((await handler(request('wrong'))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('uses soft Auth deletion and records completion only afterwards', async () => {
    const result = await handler(request());
    expect(result.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(id, true);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'admin_prepare_account_deletion', { p_user_id: id });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'admin_complete_account_deletion', { p_user_id: id });
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[1]);
  });
  it('keeps failed Auth deletion pending and returns an actionable retry error', async () => {
    mocks.remove.mockResolvedValue({ error: new Error('provider unavailable') });
    const result = await handler(request());
    expect(result.status).toBe(502); expect((await result.json()).error).toMatch(/Retry deletion/);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('can complete a retry after the Auth identity has already been deleted', async () => {
    mocks.lookup.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
    expect((await handler(request())).status).toBe(200);
    expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
