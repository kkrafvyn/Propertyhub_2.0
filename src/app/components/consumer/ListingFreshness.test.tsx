import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
const insert = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'reporter' } }) }));
vi.mock('../../../lib/supabase', () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { ListingFreshness } from './ListingFreshness';
describe('availability reporting', () => {
  it('keeps a failed report editable and does not claim an edit confirms availability', async () => {
    insert.mockResolvedValueOnce({ error: new Error('offline') }).mockResolvedValueOnce({ error: null });
    render(<MemoryRouter><ListingFreshness listing={{ id: 'listing-1', updated_at: '2026-01-01' }} /></MemoryRouter>);
    expect(screen.getByText(/has not recorded an availability confirmation/)).toBeTruthy();
    const user = userEvent.setup(); await user.click(screen.getByText('Report unavailable home'));
    await user.type(screen.getByLabelText('What did you find?'), 'The agent said it was rented.');
    await user.click(screen.getByText('Submit report'));
    expect(screen.getByLabelText('What did you find?')).toHaveValue('The agent said it was rented.');
    await user.click(screen.getByText('Submit report'));
    expect(screen.getByText('Report submitted')).toBeDisabled();
    expect(insert).toHaveBeenLastCalledWith(expect.objectContaining({ reporter_id: 'reporter', target_id: 'listing-1', reason: 'unavailable_property', status: 'pending' }));
  });
});
