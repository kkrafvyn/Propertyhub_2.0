#!/usr/bin/env node
/**
 * Grant platform admin access to a user by email.
 *
 * Usage:
 *   npm run security:grant-platform-admin -- kkrafvyn@gmail.com
 *
 * Requires in root .env:
 *   - SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL, OR
 *   - SUPABASE_DB_URL / SUPABASE_DB_PASSWORD (+ VITE_SUPABASE_URL)
 */
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "../load-project-env.mjs";

const emailArg = process.argv[2]?.trim().toLowerCase();
if (!emailArg) {
  console.error("Usage: npm run security:grant-platform-admin -- <email>");
  process.exit(1);
}

function getDbConfig(env) {
  if (env.SUPABASE_DB_URL) {
    return { connectionString: env.SUPABASE_DB_URL };
  }
  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in root .env");
  }
  const ref = env.SUPABASE_PROJECT_REF || new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  const port = Number(env.SUPABASE_DB_PORT || 5432);
  const host = env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;
  return {
    host,
    port,
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

async function findAuthUserViaDb(client, email) {
  const { rows } = await client.query(
    `SELECT id, email, raw_user_meta_data, raw_app_meta_data
     FROM auth.users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

async function grantViaDatabase(env, email) {
  const client = new pg.Client(getDbConfig(env));
  await client.connect();
  try {
    const authUser = await findAuthUserViaDb(client, email);
    if (!authUser) {
      throw new Error(`No auth.users row found for ${email}. User must sign up first.`);
    }

    const userMeta = {
      ...(authUser.raw_user_meta_data ?? {}),
      role: "platform_admin",
    };
    const appMeta = {
      ...(authUser.raw_app_meta_data ?? {}),
      role: "platform_admin",
    };

    await client.query(
      `UPDATE auth.users
       SET raw_user_meta_data = $2::jsonb,
           raw_app_meta_data = $3::jsonb,
           updated_at = now()
       WHERE id = $1`,
      [authUser.id, JSON.stringify(userMeta), JSON.stringify(appMeta)],
    );

    await client.query("ALTER TABLE public.users DISABLE TRIGGER trg_protect_users_privileged_columns");

    try {
      await client.query(
        `INSERT INTO public.users (id, email, full_name, is_platform_admin, verified)
         VALUES ($1, $2, COALESCE($3, split_part($2, '@', 1)), TRUE, TRUE)
         ON CONFLICT (id) DO UPDATE
         SET is_platform_admin = TRUE,
             verified = TRUE,
             updated_at = now()`,
        [authUser.id, email, userMeta.full_name ?? null],
      );
    } finally {
      await client.query("ALTER TABLE public.users ENABLE TRIGGER trg_protect_users_privileged_columns");
    }

    const { rows } = await client.query(
      `SELECT id, email, is_platform_admin, verified
       FROM public.users
       WHERE id = $1`,
      [authUser.id],
    );

    return rows[0];
  } finally {
    await client.end();
  }
}

async function grantViaServiceRole(env, email) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const authUser = listed.users.find((user) => user.email?.toLowerCase() === email);
  if (!authUser) {
    throw new Error(`No auth user found for ${email}. User must sign up first.`);
  }

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: {
      ...(authUser.user_metadata ?? {}),
      role: "platform_admin",
    },
    app_metadata: {
      ...(authUser.app_metadata ?? {}),
      role: "platform_admin",
    },
  });
  if (authUpdateError) throw authUpdateError;

  const { data: profile, error: profileError } = await admin
    .from("users")
    .upsert(
      {
        id: authUser.id,
        email,
        full_name: authUser.user_metadata?.full_name ?? email.split("@")[0],
        is_platform_admin: true,
        verified: true,
      },
      { onConflict: "id" },
    )
    .select("id, email, is_platform_admin, verified")
    .single();

  if (profileError) throw profileError;
  return profile;
}

async function main() {
  const env = loadProjectEnv();
  let profile;

  try {
    if (env.SUPABASE_SERVICE_ROLE_KEY && env.VITE_SUPABASE_URL) {
      console.log(`Granting platform admin via service role for ${emailArg}…`);
      profile = await grantViaServiceRole(env, emailArg);
    } else {
      console.log(`Granting platform admin via database for ${emailArg}…`);
      profile = await grantViaDatabase(env, emailArg);
    }

    console.log("Platform admin granted:");
    console.log(JSON.stringify(profile, null, 2));
    console.log("\nUser should sign out and sign back in, then open /admin.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
