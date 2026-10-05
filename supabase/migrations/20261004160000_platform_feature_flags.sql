-- Platform-wide feature toggles (platform admins via platform_settings).

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('feature_whatsapp_enabled', 'true', 'Enable WhatsApp automation and outbound messaging in the app'),
  ('feature_voice_calls_enabled', 'true', 'Enable in-app and click-to-call voice features'),
  ('feature_video_calls_enabled', 'true', 'Enable video calling when a video provider is configured'),
  ('feature_ai_assistant_enabled', 'true', 'Enable AI assistant, command center, and ai-assistant edge')
ON CONFLICT (key) DO NOTHING;
