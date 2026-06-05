import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AgencyOnboarding from '../pages/agency/AgencyOnboarding'
import { vi } from 'vitest'

// Mock Zustand store
vi.mock('../store/useAgencyStore', () => ({
  useAgencyStore: () => ({
    createAgency: vi.fn(),
    loading: false,
    error: null,
  }),
}))

describe('AgencyOnboarding Component', () => {
  it('should render onboarding wizard', () => {
    render(<AgencyOnboarding />)

    expect(screen.getByText(/add smart device/i)).toBeInTheDocument()
  })

  it('should navigate through steps', async () => {
    render(<AgencyOnboarding />)
    const user = userEvent.setup()

    // Fill first step
    const companyNameInput = screen.getByPlaceholderText(/company name/i)
    await user.type(companyNameInput, 'Test Agency')

    // Click next button
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    // Should show second step
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    })
  })
})
