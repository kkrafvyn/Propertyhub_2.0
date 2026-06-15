import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('analytics funnel', () => {
  beforeEach(() => {
    window.posthog.capture.mockClear()
  })

  it('trackFunnel captures funnel events', async () => {
    const { trackFunnel } = await import('./analytics.js')
    trackFunnel('search', { query: 'accra' })
    expect(window.posthog.capture).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({ funnel_step: 'search', query: 'accra' }),
    )
  })
})
