import { describe, expect, it } from 'vitest';
import {
  canAccessOrganization,
  getOrganizationAccessError,
} from './organization-access';

describe('organization access checks', () => {
  it('allows a member to access their own organization', () => {
    expect(
      canAccessOrganization({
        userOrganizationIds: ['org-1', 'org-2'],
        targetOrganizationId: 'org-1',
        isPlatformAdmin: false,
      }),
    ).toBe(true);
  });

  it('blocks a user outside the organization', () => {
    expect(
      canAccessOrganization({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-2',
        isPlatformAdmin: false,
      }),
    ).toBe(false);
  });

  it('allows platform staff to access any organization', () => {
    expect(
      canAccessOrganization({
        userOrganizationIds: [],
        targetOrganizationId: 'org-2',
        isPlatformStaff: true,
      }),
    ).toBe(true);
  });

  it('returns a clear denial message for invalid access', () => {
    expect(
      getOrganizationAccessError({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-2',
        isPlatformAdmin: false,
      }),
    ).toBe('Access denied: user is not a member of this organization.');
  });
});
