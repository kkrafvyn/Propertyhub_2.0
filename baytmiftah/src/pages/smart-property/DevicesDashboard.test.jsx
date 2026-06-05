import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DevicesDashboard from '../pages/smart-property/DevicesDashboard'
import { vi } from 'vitest'

// Mock Zustand store
vi.mock('../store/useSmartDeviceStore', () => ({
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
    render(<DevicesDashboard />)

    expect(screen.getByText(/smart devices/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/front door lock/i)).toBeInTheDocument()
    })
  })

  it('should display device status', async () => {
    render(<DevicesDashboard />)

    await waitFor(() => {
      expect(screen.getByText('online')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument() // Battery
    })
  })
})
