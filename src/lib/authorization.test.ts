import { describe, expect, it } from 'vitest';
import {
  assertOrganizationAccess,
  canAccessOrganizationForAction,
  getAuthorizationError,
} from './authorization';

describe('authorization enforcement', () => {
  it('allows a member with the required permission in the right org', () => {
    expect(
      canAccessOrganizationForAction({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-1',
        role: 'manager',
        permission: 'finance:read',
      }),
    ).toBe(true);
  });

  it('blocks access when the user is outside the organization', () => {
    expect(
      canAccessOrganizationForAction({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-2',
        role: 'manager',
        permission: 'finance:read',
      }),
    ).toBe(false);
  });

  it('blocks a role without permission even within the org', () => {
    expect(
      canAccessOrganizationForAction({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-1',
        role: 'agent',
        permission: 'team:manage',
      }),
    ).toBe(false);
  });

  it('throws a clear auth error when access is denied', () => {
    expect(() =>
      assertOrganizationAccess({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-2',
        role: 'agent',
        permission: 'team:manage',
      }),
    ).toThrow('Authorization denied: user is not a member of this organization.');
  });

  it('returns a clear auth error message', () => {
    expect(
      getAuthorizationError({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: 'org-2',
        role: 'agent',
        permission: 'team:manage',
      }),
    ).toBe('Authorization denied: user is not a member of this organization.');
  });

  it('requires a target org context for sensitive actions', () => {
    expect(
      getAuthorizationError({
        userOrganizationIds: ['org-1'],
        targetOrganizationId: null,
        role: 'owner',
        permission: 'finance:write',
      }),
    ).toBe('Authorization denied: missing organization context.');
  });
});
