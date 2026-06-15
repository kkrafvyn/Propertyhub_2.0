import { describe, it, expect, beforeEach } from 'vitest'

describe('saved-listings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('toggleSavedId adds and removes ids', async () => {
    const { toggleSavedId, isSaved } = await import('./saved-listings.js')
    expect(isSaved('a')).toBe(false)
    toggleSavedId('a')
    expect(isSaved('a')).toBe(true)
    toggleSavedId('a')
    expect(isSaved('a')).toBe(false)
  })

  it('setSavedIds persists array', async () => {
    const { setSavedIds, getSavedIds } = await import('./saved-listings.js')
    setSavedIds(['x', 'y'])
    expect(getSavedIds()).toEqual(['x', 'y'])
  })
})
