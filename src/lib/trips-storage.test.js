import { describe, it, expect, beforeEach } from 'vitest'
import { updateTripStatus, getTrips, addTrip } from './trips-storage.js'

describe('trips-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('addTrip and updateTripStatus', () => {
    const trip = addTrip({ listing_id: 'l1', preferred_date: '2026-06-20' })
    expect(getTrips()[0].status).toBe('pending')
    updateTripStatus(trip.id, 'cancelled')
    expect(getTrips()[0].status).toBe('cancelled')
  })
})
