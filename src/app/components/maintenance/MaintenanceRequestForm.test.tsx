import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { createRequest, uploadRequestPhotos, success, error } = vi.hoisted(() => ({
  createRequest: vi.fn(), uploadRequestPhotos: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('../../../lib/maintenance.service', () => ({ maintenanceService: { createRequest, uploadRequestPhotos } }));
vi.mock('../../../lib/monitoring', () => ({ monitoring: { trackWorkflowStep: vi.fn() } }));
vi.mock('../../../lib/deep-link', () => ({ mobileCaptureProps: () => ({}) }));
vi.mock('sonner', () => ({ toast: { success, error } }));
import { MaintenanceRequestForm } from './MaintenanceRequestForm';
const leases = [
  { id: 'lease-one', organization_id: 'org-one', listing_id: 'listing-one', status: 'active' },
  { id: 'lease-two', organization_id: 'org-two', listing_id: 'listing-two', status: 'active' },
];
const fill = () => {
  fireEvent.change(screen.getByLabelText('Issue title'), { target: { value: 'Leaking tap' } });
  fireEvent.change(screen.getByLabelText('Describe the issue'), { target: { value: 'Kitchen tap drips' } });
  fireEvent.change(screen.getByLabelText(/Photos/), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
};
describe('maintenance request retry', () => {
  beforeEach(() => {
    vi.resetAllMocks(); createRequest.mockResolvedValue({ id: 'saved-request', organization_id: 'org-one' });
    uploadRequestPhotos.mockResolvedValue({ id: 'saved-request' });
  });
  it('retains the original request and lease on upload failure, then retries without creating duplicates', async () => {
    const refreshed = vi.fn().mockResolvedValue(undefined);
    uploadRequestPhotos.mockRejectedValueOnce(new Error('Connection lost'));
    render(<MaintenanceRequestForm userId="tenant" leases={leases} onCreated={refreshed} />);
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
    expect(screen.getByLabelText('Lease')).toBeDisabled();
    expect(screen.getByLabelText('Issue title')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry photos' }));
    await waitFor(() => expect(refreshed).toHaveBeenCalledOnce());
    expect(createRequest).toHaveBeenCalledOnce();
    expect(uploadRequestPhotos).toHaveBeenCalledTimes(2);
    expect(uploadRequestPhotos).toHaveBeenLastCalledWith(expect.objectContaining({ organizationId: 'org-one', requestId: 'saved-request' }));
    expect(screen.getByLabelText('Issue title')).toHaveValue('');
  });
  it('can finish the saved request without photos after an upload failure', async () => {
    const refreshed = vi.fn().mockResolvedValue(undefined);
    uploadRequestPhotos.mockRejectedValue(new Error('Storage unavailable'));
    render(<MaintenanceRequestForm userId="tenant" leases={leases} onCreated={refreshed} />);
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Finish without photos' }));
    await waitFor(() => expect(refreshed).toHaveBeenCalledOnce());
    expect(createRequest).toHaveBeenCalledOnce(); expect(uploadRequestPhotos).toHaveBeenCalledOnce();
  });
  it('invalid files do not create requests and refresh failure does not invite resubmission', async () => {
    render(<MaintenanceRequestForm userId="tenant" leases={leases} onCreated={vi.fn().mockRejectedValue(new Error('Refresh unavailable'))} />);
    fill();
    fireEvent.change(screen.getByLabelText(/Photos/), { target: { files: [new File(['bad'], 'bad.html', { type: 'text/html' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('file type is not allowed');
    expect(createRequest).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Photos/), { target: { files: [] } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining('Request saved')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry photos' })).not.toBeInTheDocument();
  });
});
