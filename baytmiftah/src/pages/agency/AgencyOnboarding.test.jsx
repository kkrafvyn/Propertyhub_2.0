import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import AgencyOnboarding from './AgencyOnboarding'
import { vi } from 'vitest'

// Mock Zustand store
vi.mock('../../store/useAgencyStore', () => ({
  useAgencyStore: () => ({
    createAgency: vi.fn(),
    loading: false,
    error: null,
  }),
}))

describe('AgencyOnboarding Component', () => {
  it('should render onboarding wizard', () => {
    render(
      <BrowserRouter>
        <AgencyOnboarding />
      </BrowserRouter>
    )

    expect(screen.getAllByText(/Agency Identity/i).length).toBeGreaterThan(0)
  })

  it('should navigate through steps', async () => {
    render(
      <BrowserRouter>
        <AgencyOnboarding />
      </BrowserRouter>
    )
    const user = userEvent.setup()

    const companyNameInput = screen.getByPlaceholderText(/Global Realty Partners/i)
    await user.type(companyNameInput, 'Test Agency')

    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/PropFlow Agency/i)).toBeInTheDocument()
    })
  })
})
