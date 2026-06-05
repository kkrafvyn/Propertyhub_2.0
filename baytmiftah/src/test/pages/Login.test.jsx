import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../../pages/Login'

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

    expect(screen.getByText(/Sign In/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument()
  })

  it('updates form fields when user types', () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText(/Email/i)
    const passwordInput = screen.getByPlaceholderText(/Password/i)

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

    const submitButton = screen.getByText(/Sign In/i).closest('button')
    const emailInput = screen.getByPlaceholderText(/Email/i)

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Invalid email/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid credentials', async () => {
    render(
      <BrowserRouter>
        <Login setUser={mockSetUser} />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText(/Email/i)
    const passwordInput = screen.getByPlaceholderText(/Password/i)
    const submitButton = screen.getByText(/Sign In/i).closest('button')

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

    const signupLink = screen.getByText(/Don't have an account/i).closest('a')
    expect(signupLink).toHaveAttribute('href', '/signup')
  })
})
