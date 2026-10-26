import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { DocumentChecklist } from './DocumentChecklist';
import { NotificationControls } from './NotificationControls';
const getPreferences = vi.hoisted(() => vi.fn());
const updatePreferences = vi.hoisted(() => vi.fn());
vi.mock('../../../lib/communication.service', () => ({ communicationService: { getNotificationPreferences: getPreferences, updateNotificationPreferences: updatePreferences } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
describe('consumer preparation and notification choices', () => {
  it('switches checklists without treating local checkmarks as verified documents', async () => {
    render(<DocumentChecklist />); const user = userEvent.setup();
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.selectOptions(screen.getByRole('combobox'), 'purchase');
    expect(screen.getByText(/independent review of ownership/)).toBeTruthy();
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
    expect(screen.getByText(/not a required upload list/)).toBeTruthy();
  });
  it('persists channel preferences only after save', async () => {
    getPreferences.mockResolvedValue({ in_app_enabled: true, email_enabled: false, push_enabled: false, sms_enabled: false, whatsapp_enabled: false, notification_frequency: 'daily', quiet_hours_enabled: false }); updatePreferences.mockResolvedValue({});
    render(<MemoryRouter><NotificationControls userId="user-1" /></MemoryRouter>); const user = userEvent.setup();
    await user.click(screen.getByText('Notification preferences'));
    const email = await screen.findByLabelText('Email'); await user.click(email);
    expect(updatePreferences).not.toHaveBeenCalled();
    await user.click(screen.getByText('Save preferences'));
    expect(updatePreferences).toHaveBeenCalledWith('user-1', expect.objectContaining({ email_enabled: true }));
  });
});
