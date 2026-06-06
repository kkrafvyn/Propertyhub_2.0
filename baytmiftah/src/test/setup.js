import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageStore = new Map()

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key) =>
      localStorageStore.has(key) ? localStorageStore.get(key) : null
    ),
    setItem: vi.fn((key, value) => {
      localStorageStore.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      localStorageStore.delete(key)
    }),
    clear: vi.fn(() => {
      localStorageStore.clear()
    }),
  },
  writable: true,
})
