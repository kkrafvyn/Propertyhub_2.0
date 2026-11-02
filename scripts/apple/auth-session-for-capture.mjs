import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "../load-project-env.mjs";

/**
 * @param {string} email
 * @param {string} password
 */
export async function createBrowserAuthSeed(email, password) {
  const env = loadProjectEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL / anon key in .env");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error || new Error("Sign-in failed for capture session");

  const host = new URL(url).hostname;
  const projectRef = host.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const storageValue = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });

  return { storageKey, storageValue };
}

/**
 * @param {import('playwright').BrowserContext} context
 * @param {string} email
 * @param {string} password
 */
export async function seedAuthOnContext(context, email, password) {
  const { storageKey, storageValue } = await createBrowserAuthSeed(email, password);
  await context.addInitScript(
    ({ storageKey, storageValue }) => {
      try {
        localStorage.setItem(storageKey, storageValue);
      } catch {
        /* ignore */
      }
    },
    { storageKey, storageValue },
  );
}
