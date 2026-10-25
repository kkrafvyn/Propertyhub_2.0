import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => unknown),
  locked: false,
  ensureProfile: vi.fn(),
  track: vi.fn().mockResolvedValue(null),
  unsubscribe: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {
  auth: {
    getSession: vi.fn().mockResolvedValue({data:{session:null},error:null}),
    onAuthStateChange: vi.fn((callback) => { mocks.listener=callback; return {data:{subscription:{unsubscribe:mocks.unsubscribe}}}; }),
  },
  rpc: vi.fn().mockResolvedValue({error:null}),
} }));
vi.mock('../../lib/user.service', () => ({userService:{
  ensureUserProfile: mocks.ensureProfile,
  hasOrganizationMembership: vi.fn().mockResolvedValue(false),
}}));
vi.mock('../../lib/consumer-context.service', () => ({consumerContextService:{getConsumerContext:vi.fn().mockResolvedValue({})}}));
vi.mock('../../lib/security/session-tracking', () => ({trackUserSession:mocks.track}));
vi.mock('../../lib/desktop-oauth', () => ({subscribeDesktopOAuthCallback:vi.fn(() => () => {})}));
vi.mock('../../lib/native-oauth', () => ({subscribeNativeOAuthCallback:vi.fn(() => () => {})}));
function Status() { const auth=useAuth();return <div>{auth.profile?.full_name ?? 'No profile'}</div>; }
const session={user:{id:'review-user',email:'review@example.invalid',user_metadata:{role:'agent'}}};

beforeEach(() => {
  vi.useFakeTimers();mocks.locked=false;mocks.ensureProfile.mockReset();mocks.track.mockClear();
  mocks.ensureProfile.mockImplementation(async () => {
    if(mocks.locked)throw new Error('Profile query attempted under the Supabase auth lock');
    return {id:'review-user',full_name:'Review Demo'};
  });
});
afterEach(() => {vi.useRealTimers();});
describe('AuthProvider auth lock regression', () => {
  it('returns from the auth callback before making profile or session requests', async () => {
    render(<AuthProvider><Status /></AuthProvider>);
    await act(async () => { await Promise.resolve(); });
    mocks.locked=true;
    act(() => { expect(mocks.listener?.('SIGNED_IN',session)).toBeUndefined(); });
    expect(mocks.ensureProfile).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
    mocks.locked=false;
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('Review Demo')).toBeTruthy();
    expect(mocks.track).toHaveBeenCalledWith('review-user');
  });
  it('cancels deferred profile work when the provider unmounts', async () => {
    const view=render(<AuthProvider><Status /></AuthProvider>);
    await act(async () => { await Promise.resolve(); });
    act(() => {mocks.listener?.('SIGNED_IN',session);});
    view.unmount();
    await act(async () => {await vi.advanceTimersByTimeAsync(0);});
    expect(mocks.ensureProfile).not.toHaveBeenCalled();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
});
