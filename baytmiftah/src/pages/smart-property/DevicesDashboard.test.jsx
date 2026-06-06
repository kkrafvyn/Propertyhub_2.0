import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import DevicesDashboard from './DevicesDashboard'
import { vi } from 'vitest'

// Mock Zustand store
vi.mock('../../store/useSmartDeviceStore', () => ({
  useSmartDeviceStore: () => ({
    devices: [
      {
        id: '1',
        name: 'Front Door Lock',
        type: 'smart_lock',
        status: 'online',
        battery_level: 85,
        signal_strength: 95,
        last_seen: new Date().toISOString(),
      },
    ],
    fetchDevices: vi.fn(),
    loading: false,
    error: null,
  }),
}))

describe('DevicesDashboard Component', () => {
  it('should render devices grid', async () => {
    render(
      <BrowserRouter>
        <DevicesDashboard />
      </BrowserRouter>
    )

    expect(screen.getByText(/Smart Control Center/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText(/Emerald Gardens - Main/i).length).toBeGreaterThan(0)
    })
  })

  it('should display device status', async () => {
    render(
      <BrowserRouter>
        <DevicesDashboard />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/8 Doors Secured/i)).toBeInTheDocument()
      expect(screen.getByText(/72°F/i)).toBeInTheDocument()
    })
  })
})
