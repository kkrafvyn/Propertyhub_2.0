import { describe, expect, it, vi } from 'vitest';
const query = vi.hoisted(() => ({ select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) }));
vi.mock('./supabase', () => ({ supabase: { from: () => query } }));
import { listingService } from './listing.service';
describe('anonymous shortlist access', () => {
  it('always restricts results to listed public properties', async () => {
    await listingService.getPublicShortlist(['550e8400-e29b-41d4-a716-446655440000']);
    expect(query.eq).toHaveBeenCalledWith('status', 'listed');
    expect(query.eq).toHaveBeenCalledWith('visibility', 'public');
  });
});
