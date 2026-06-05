import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Test utilities
export function renderWithRouter(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

export async function waitForElement(testId) {
  return waitFor(() => screen.getByTestId(testId))
}

export function mockLocalStorage() {
  const store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
  }
}

// Mock API responses
export function mockAPIResponse(data, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

export function mockAPIError(message = 'API Error', status = 500) {
  return Promise.reject({
    response: {
      status,
      data: { message },
    },
  })
}
