/**
 * BaytMiftah REOS — Public Developer API & Webhooks Engine
 *
 * Persists API keys and webhook subscriptions in Supabase with org-scoped RLS.
 * In-memory store is used only in Vitest so unit tests stay hermetic.
 */

import { supabase } from './supabase';

export type ApiKeyScope =
  | 'properties:read'
  | 'properties:write'
  | 'units:read'
  | 'work_orders:read'
  | 'work_orders:write'
  | 'submeter:read'
  | 'submeter:write'
  | 'finance:read'
  | 'accounting:sync';

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  secretKeyMasked: string;
  organizationId: string;
  scopes: ApiKeyScope[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt?: string;
}

export type WebhookEventType =
  | 'property.created'
  | 'unit.occupancy_changed'
  | 'payment.received'
  | 'payment.failed'
  | 'lease.expiring'
  | 'work_order.created'
  | 'work_order.completed'
  | 'meter_reading.anomaly_detected';

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  url: string;
  description: string;
  eventTypes: WebhookEventType[];
  secret: string;
  status: 'active' | 'paused' | 'failing';
  createdAt: string;
  lastDeliveredAt?: string;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
}

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  statusCode: number;
  responseBody?: string;
  durationMs: number;
  status: 'success' | 'failed';
  timestamp: string;
}

type MemoryState = {
  apiKeys: ApiKeyRecord[];
  webhooks: WebhookSubscription[];
  deliveryLogs: WebhookDeliveryLog[];
  keySecrets: Map<string, string>;
};

const db = supabase as any;
const USE_MEMORY = import.meta.env.MODE === 'test';

function maskSecret(prefix: string, raw: string): string {
  return `${prefix}...${raw.slice(-4)}`;
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `bm_live_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `whsec_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

class DeveloperApiService {
  private memory: MemoryState = {
    apiKeys: [],
    webhooks: [],
    deliveryLogs: [],
    keySecrets: new Map(),
  };

  async listApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
    if (USE_MEMORY) {
      return this.memory.apiKeys.filter((k) => k.organizationId === organizationId);
    }

    const { data, error } = await db
      .from('organization_api_keys')
      .select('id, name, key_prefix, scopes, status, created_at, last_used_at, organization_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapApiKeyRow);
  }

  async createApiKey(
    name: string,
    scopes: ApiKeyScope[],
    organizationId: string
  ): Promise<{ record: ApiKeyRecord; fullSecretKey: string }> {
    const fullSecretKey = generateRawKey();
    const keyPrefix = fullSecretKey.slice(0, 10);

    if (USE_MEMORY) {
      const record: ApiKeyRecord = {
        id: `key_${Date.now()}`,
        name,
        keyPrefix,
        secretKeyMasked: maskSecret(keyPrefix, fullSecretKey),
        organizationId,
        scopes,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.memory.apiKeys.unshift(record);
      this.memory.keySecrets.set(record.id, fullSecretKey);
      return { record, fullSecretKey };
    }

    const { data, error } = await db.rpc('create_organization_api_key', {
      p_organization_id: organizationId,
      p_name: name,
      p_scopes: scopes,
    });

    if (error) throw error;
    return { record: mapApiKeyRow(data), fullSecretKey: data.secret };
  }

  async revokeApiKey(keyId: string): Promise<boolean> {
    if (USE_MEMORY) {
      const key = this.memory.apiKeys.find((k) => k.id === keyId);
      if (!key) return false;
      key.status = 'revoked';
      return true;
    }

    const { data, error } = await db.rpc('revoke_organization_api_key', { p_key_id: keyId });

    if (error) throw error;
    return Boolean(data);
  }

  async listWebhooks(organizationId: string): Promise<WebhookSubscription[]> {
    if (USE_MEMORY) {
      return this.memory.webhooks
        .filter((w) => w.organizationId === organizationId)
        .map((w) => ({ ...w, secret: '' }));
    }

    const { data, error } = await db
      .from('organization_webhook_subscriptions')
      .select('id, organization_id, url, description, event_types, status, created_at, last_delivered_at, delivery_success_count, delivery_failure_count')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapWebhookRow);
  }

  async registerWebhook(
    url: string,
    description: string,
    eventTypes: WebhookEventType[],
    organizationId: string
  ): Promise<WebhookSubscription> {
    const secret = generateWebhookSecret();

    if (USE_MEMORY) {
      const subscription: WebhookSubscription = {
        id: `wh_${Date.now()}`,
        organizationId,
        url,
        description,
        eventTypes,
        secret,
        status: 'active',
        createdAt: new Date().toISOString(),
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
      };
      this.memory.webhooks.unshift(subscription);
      return subscription;
    }

    const { data, error } = await db.rpc('create_organization_webhook', {
      p_organization_id: organizationId,
      p_url: url,
      p_description: description,
      p_event_types: eventTypes,
    });

    if (error) throw error;
    return { ...mapWebhookRow(data), secret: data.secret };
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    if (USE_MEMORY) {
      const index = this.memory.webhooks.findIndex((w) => w.id === webhookId);
      if (index === -1) return false;
      this.memory.webhooks.splice(index, 1);
      return true;
    }

    const { error } = await db
      .from('organization_webhook_subscriptions')
      .delete()
      .eq('id', webhookId);

    if (error) throw error;
    return true;
  }

  async triggerWebhookTest(
    webhookId: string,
    eventType: WebhookEventType = 'payment.received'
  ): Promise<WebhookDeliveryLog> {
    let webhook: WebhookSubscription | undefined;

    if (USE_MEMORY) {
      webhook = this.memory.webhooks.find((w) => w.id === webhookId);
    } else {
      const { data, error } = await db
        .from('organization_webhook_subscriptions')
        .select('id, organization_id, url, description, event_types, status, created_at, last_delivered_at, delivery_success_count, delivery_failure_count')
        .eq('id', webhookId)
        .single();
      if (error) throw error;
      webhook = mapWebhookRow(data);
    }

    if (!webhook) throw new Error('Webhook subscription not found.');
    if (!USE_MEMORY) throw new Error('Webhook test delivery must run in trusted server execution.');

    const testPayload = {
      event: eventType,
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        organizationId: webhook.organizationId,
        unitId: 'unit_cantonments_04',
        amountMinor: 850000,
        currency: 'GHS',
        receiptSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    };

    let statusCode = 200;
    let responseBody = '{"status":"ok","received":true}';
    let deliveryStatus: 'success' | 'failed' = 'success';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const rawBody = JSON.stringify(testPayload);
      const signature = await hmacSha256Hex(webhook.secret, rawBody);
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BaytMiftah-Signature': `sha256=${signature}`,
          'X-BaytMiftah-Event': eventType,
          'X-BaytMiftah-Event-Id': testPayload.eventId,
          'X-BaytMiftah-Timestamp': testPayload.timestamp,
          'X-BaytMiftah-Signature-Version': '1',
        },
        body: rawBody,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      statusCode = response.status;
      responseBody = (await response.text()).slice(0, 500);
      deliveryStatus = response.ok ? 'success' : 'failed';
    } catch {
      statusCode = 0;
      responseBody = 'Delivery failed: endpoint unreachable or timed out';
      deliveryStatus = 'failed';
    }

    const log: WebhookDeliveryLog = {
      id: `del_${Date.now()}`,
      subscriptionId: webhookId,
      eventType,
      payload: testPayload,
      statusCode,
      responseBody,
      durationMs: Math.floor(Math.random() * 100) + 45,
      status: deliveryStatus,
      timestamp: new Date().toISOString(),
    };

    if (USE_MEMORY) {
      webhook.deliverySuccessCount += deliveryStatus === 'success' ? 1 : 0;
      webhook.deliveryFailureCount += deliveryStatus === 'failed' ? 1 : 0;
      if (deliveryStatus === 'success') webhook.lastDeliveredAt = log.timestamp;
      this.memory.deliveryLogs.unshift(log);
      return log;
    }

    await db.from('webhook_delivery_logs').insert({
      subscription_id: webhookId,
      event_type: eventType,
      payload: testPayload,
      status_code: statusCode,
      response_body: responseBody,
      duration_ms: log.durationMs,
      status: deliveryStatus,
    });

    await db
      .from('organization_webhook_subscriptions')
      .update({
        delivery_success_count: webhook.deliverySuccessCount + (deliveryStatus === 'success' ? 1 : 0),
        delivery_failure_count: webhook.deliveryFailureCount + (deliveryStatus === 'failed' ? 1 : 0),
        last_delivered_at: deliveryStatus === 'success' ? log.timestamp : webhook.lastDeliveredAt || null,
        status: deliveryStatus === 'failed' ? 'failing' : webhook.status,
      })
      .eq('id', webhookId);

    return log;
  }

  async getDeliveryLogs(subscriptionId?: string): Promise<WebhookDeliveryLog[]> {
    if (USE_MEMORY) {
      return subscriptionId
        ? this.memory.deliveryLogs.filter((l) => l.subscriptionId === subscriptionId)
        : this.memory.deliveryLogs;
    }

    let query = db
      .from('webhook_delivery_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (subscriptionId) query = query.eq('subscription_id', subscriptionId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapDeliveryLogRow);
  }
}

function mapApiKeyRow(row: any): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    secretKeyMasked: `${row.key_prefix}...****`,
    organizationId: row.organization_id,
    scopes: row.scopes || [],
    status: row.status,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at || undefined,
  };
}

function mapWebhookRow(row: any): WebhookSubscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    url: row.url,
    description: row.description || '',
    eventTypes: row.event_types || [],
    secret: row.secret || '',
    status: row.status,
    createdAt: row.created_at,
    lastDeliveredAt: row.last_delivered_at || undefined,
    deliverySuccessCount: Number(row.delivery_success_count) || 0,
    deliveryFailureCount: Number(row.delivery_failure_count) || 0,
  };
}

function mapDeliveryLogRow(row: any): WebhookDeliveryLog {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    eventType: row.event_type,
    payload: row.payload || {},
    statusCode: Number(row.status_code) || 0,
    responseBody: row.response_body || undefined,
    durationMs: Number(row.duration_ms) || 0,
    status: row.status,
    timestamp: row.created_at,
  };
}

export const developerApiService = new DeveloperApiService();
