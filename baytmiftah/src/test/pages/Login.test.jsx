import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../../pages/Login'

vi.mock('../../services/auth-service', () => ({
  default: {
    signIn: vi.fn(() =>
      Promise.resolve({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          user_metadata: { display_name: 'Test User', role: 'buyer' },
          app_metadata: {},
        },
      })
    ),
  },
}))

describe('Login Page', () => {
  const mockSetUser = vi.fn()

  beforeEach(() => {
    mockSetUser.mockClear()
  })

  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    expect(screen.getByText(/Secure Login/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Professional Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Access Key/i)).toBeInTheDocument()
  })

  it('updates form fields when user types', () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    const emailInput = screen.getByLabelText(/Professional Email/i)
    const passwordInput = screen.getByLabelText(/Access Key/i)

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('displays error message for invalid email', async () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    const submitButton = screen.getByText(/Secure Login/i).closest('button')
    const emailInput = screen.getByLabelText(/Professional Email/i)

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(emailInput).toBeInvalid()
    })
  })

  it('submits form with valid credentials', async () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    const emailInput = screen.getByLabelText(/Professional Email/i)
    const passwordInput = screen.getByLabelText(/Access Key/i)
    const submitButton = screen.getByText(/Secure Login/i).closest('button')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalled()
    })
  })

  it('has link to signup page', () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    const signupLink = screen.getByRole('link', { name: /Request Access/i })
    expect(signupLink).toHaveAttribute('href', '/signup')
  })
})
