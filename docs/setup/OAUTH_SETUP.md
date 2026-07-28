# OAuth setup (Google & Apple)

Enable social sign-in in Supabase, then confirm redirect URLs in this app.

## 1. Supabase dashboard

Project → **Authentication** → **Providers**

### Google
1. Enable Google provider
2. Add OAuth client ID + secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. Authorized redirect URI (Supabase shows this):
   ```
   https://ixmbfnfwpjwbfahqaftc.supabase.co/auth/v1/callback
   ```

### Apple
1. Enable Apple provider
2. Add Services ID, team ID, key ID, and private key from Apple Developer
3. Use the same Supabase callback URL above

## 2. Site URL & redirects

Project → **Authentication** → **URL Configuration**

| Setting | Value |
|---------|--------|
| Site URL | `https://baytmiftah.com` |
| Redirect URLs | `https://baytmiftah.com/**` |
| | `http://localhost:5173/**` |
| | `capacitor://localhost/**` |

## 3. App code

Login and signup already call `signInWithOAuth('google' | 'apple')` via `AuthContext`.

No extra env vars are required in `.env` — configuration lives in Supabase.

## 4. Test

1. `npm run dev`
2. Open `/login` → **Continue with Google** or **Apple**
3. Confirm redirect back to `/app` or your `oauthRedirectUrl`
