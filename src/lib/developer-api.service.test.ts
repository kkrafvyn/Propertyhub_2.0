import { describe, it, expect } from 'vitest';
import { developerApiService } from './developer-api.service';

describe('Developer API & Webhook Service', () => {
  it('lists existing API keys for an organization', async () => {
    const { record } = await developerApiService.createApiKey(
      'Seed Key',
      ['finance:read'],
      'org_test_list'
    );
    const keys = await developerApiService.listApiKeys('org_test_list');
    expect(keys.some((k) => k.id === record.id)).toBe(true);
    expect(keys[0].status).toBe('active');
  });

  it('creates a new scoped API key and returns full raw secret once', async () => {
    const { record, fullSecretKey } = await developerApiService.createApiKey(
      'Test ERP Integration',
      ['finance:read', 'accounting:sync'],
      'org_test'
    );

    expect(record.name).toBe('Test ERP Integration');
    expect(fullSecretKey.startsWith('bm_live_')).toBe(true);
    expect(record.secretKeyMasked).toContain('...');
    expect(record.status).toBe('active');
  });

  it('revokes an API key', async () => {
    const { record } = await developerApiService.createApiKey(
      'Revokable Key',
      ['properties:read'],
      'org_test_revoke'
    );

    const revoked = await developerApiService.revokeApiKey(record.id);
    expect(revoked).toBe(true);

    const keys = await developerApiService.listApiKeys('org_test_revoke');
    const found = keys.find((k) => k.id === record.id);
    expect(found?.status).toBe('revoked');
  });

  it('registers and tests a webhook subscription', async () => {
    const webhook = await developerApiService.registerWebhook(
      'https://example.com/webhook',
      'Test ERP Sync',
      ['payment.received', 'work_order.completed'],
      'org_test_wh'
    );

    expect(webhook.url).toBe('https://example.com/webhook');
    expect(webhook.secret.startsWith('whsec_')).toBe(true);

    const log = await developerApiService.triggerWebhookTest(webhook.id, 'payment.received');
    expect(log.payload.event).toBe('payment.received');

    const logs = await developerApiService.getDeliveryLogs(webhook.id);
    expect(logs.length).toBeGreaterThan(0);
  });
});
