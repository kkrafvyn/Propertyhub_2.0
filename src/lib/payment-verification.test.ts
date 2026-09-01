import { describe, expect, it } from 'vitest';
import { verifyPayangelsSignature } from './payment-verification';

describe('payment webhook verification', () => {
  it('accepts a valid HMAC signature', async () => {
    const payload = JSON.stringify({ event: 'payment_received', amount: 250 });
    const secret = 'payangels-prod-secret';
    const signature = 'sha256=' + await createTestSignature(secret, payload);

    await expect(
      verifyPayangelsSignature({ payload, secret, signature })
    ).resolves.toBe(true);
  });

  it('rejects a mismatched signature', async () => {
    await expect(
      verifyPayangelsSignature({
        payload: JSON.stringify({ event: 'payment_received', amount: 250 }),
        secret: 'payangels-prod-secret',
        signature: 'sha256=badvalue',
      })
    ).resolves.toBe(false);
  });

  it('rejects a missing secret for production verification', async () => {
    await expect(
      verifyPayangelsSignature({
        payload: JSON.stringify({ event: 'payment_received', amount: 250 }),
        secret: '',
        signature: 'sha256=abc',
      })
    ).rejects.toThrow('Missing payment webhook secret');
  });
});

async function createTestSignature(secret: string, payload: string) {
  const crypto = await import('node:crypto');
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}
