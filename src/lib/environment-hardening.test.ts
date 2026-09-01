import { describe, expect, it } from 'vitest';
import { evaluateProductionEnvironment } from './env';

describe('production environment hardening', () => {
  it('accepts a valid production configuration', () => {
    const result = evaluateProductionEnvironment({
      mode: 'production',
      viteSupabaseUrl: 'https://example.supabase.co',
      viteSupabaseAnonKey: 'anon-key',
      vitePayangelsPublicKey: 'public-key',
      aiProvider: 'openai',
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects production builds missing a required Supabase client config', () => {
    const result = evaluateProductionEnvironment({
      mode: 'production',
      viteSupabaseUrl: 'https://example.supabase.co',
      viteSupabaseAnonKey: '',
      viteSupabasePublishableKey: '',
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Production requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.');
  });

  it('warns when server-only secrets are exposed to the client build', () => {
    const result = evaluateProductionEnvironment({
      mode: 'production',
      viteSupabaseUrl: 'https://example.supabase.co',
      viteSupabaseAnonKey: 'anon-key',
      payangelsSecretKey: 'sk_live_secret',
      resendApiKey: 're_secret',
    });

    expect(result.warnings).toContain(
      'Server-only secrets must stay in Supabase Edge Function secrets or a backend-only environment; do not place them in client-facing Vite variables.'
    );
  });
});
