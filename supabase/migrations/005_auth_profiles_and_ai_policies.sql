-- Auth/profile hardening and AI assistant access policies
-- Supabase CLI was not available in this workspace, so this migration was added manually.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user();

INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name'),
  au.raw_user_meta_data ->> 'avatar_url'
FROM auth.users AS au
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = NOW();

GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;

DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own AI searches" ON public.ai_searches;
CREATE POLICY "Users can view their own AI searches"
ON public.ai_searches FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own AI searches" ON public.ai_searches;
CREATE POLICY "Users can create their own AI searches"
ON public.ai_searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI searches" ON public.ai_searches;
CREATE POLICY "Users can update their own AI searches"
ON public.ai_searches FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own AI recommendations" ON public.ai_recommendations;
CREATE POLICY "Users can view their own AI recommendations"
ON public.ai_recommendations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own AI recommendations" ON public.ai_recommendations;
CREATE POLICY "Users can create their own AI recommendations"
ON public.ai_recommendations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI recommendations" ON public.ai_recommendations;
CREATE POLICY "Users can update their own AI recommendations"
ON public.ai_recommendations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
CREATE POLICY "Users can create their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view their own audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() = admin_id);
