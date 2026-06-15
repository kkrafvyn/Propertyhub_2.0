import { vi } from 'vitest'

const store = {}

vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
})

vi.stubGlobal('window', {
  posthog: { capture: vi.fn(), init: vi.fn(), identify: vi.fn() },
})
