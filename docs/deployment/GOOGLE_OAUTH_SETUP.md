# BaytMiftah Google OAuth Setup

BaytMiftah uses Supabase Auth for Google sign-in. No Google client secret belongs in the Vite frontend or `.env` file. The secret is configured only inside Supabase.

## What is already wired in the app

- `/login` has a Google sign-in button.
- `/signup` has a Google account creation button.
- Buyer signup returns to `/app`.
- Landlord/agent signup returns to `/workspace?next=new`.
- OAuth profile creation now reads Google profile names from `full_name`, `name`, `display_name`, or `preferred_username`.
- Facebook login is not wired into BaytMiftah auth.

## Google Cloud Console

1. Open Google Cloud Console.
2. Create or select the BaytMiftah project.
3. Go to `APIs & Services` > `OAuth consent screen`.
4. Set app name to `BaytMiftah`.
5. Add support email and developer contact email.
6. Add scopes for basic profile and email only.
7. Go to `Credentials` > `Create Credentials` > `OAuth client ID`.
8. Choose `Web application`.
9. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - your production domain, for example `https://baytmiftah.com`
   - your Vercel deployment domain if still using Vercel previews
10. Add authorized redirect URI:
   - `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

## Supabase Dashboard

1. Open the Supabase project.
2. Go to `Authentication` > `Providers` > `Google`.
3. Enable Google.
4. Paste the Google OAuth client ID and client secret.
5. Go to `Authentication` > `URL Configuration`.
6. Set Site URL to the production app URL.
7. Add redirect URLs for every app origin that can start login:
   - `http://localhost:5173/**`
   - `https://baytmiftah.com/**`
   - any active Vercel preview/deployment URL pattern used by the team

## Local test

1. Start the app locally with `npm run dev`.
2. Open `/login`.
3. Click `Google`.
4. Complete Google consent.
5. Confirm the app returns to `/app` or the `next` route.

## Production test

1. Deploy the latest branch.
2. Open production `/login`.
3. Click `Google`.
4. Confirm the Google consent page uses the BaytMiftah app name.
5. Confirm the user returns to BaytMiftah and has a profile row.

## Notes

- OAuth providers create accounts automatically when the Google email is new.
- Organization enrollment and billing still happen after auth, inside the workspace onboarding flow.
- Native mobile deep-link OAuth should be handled separately when the Capacitor app is ready for store builds.
