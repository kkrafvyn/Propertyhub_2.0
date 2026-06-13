# Supabase Edge Functions

BaytMiftah uses Supabase Edge Functions as the API layer. The React app calls functions via `src/lib/edge-client.js`.

## Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `marketplace` | List and fetch properties | Public read |
| `bookings` | Viewing requests and availability | Write requires auth |
| `auth` | Sign up, login, current user | Mixed |
| `geo` | Geocode Accra neighborhoods for map search | Public |
| `messaging` | Conversations and send message | Auth for write |
| `agencies` | Agency dashboard and team | Auth |
| `moderation` | Admin overview, verification, audit | Auth |
| `persistence` | Document vault records | Auth |

## Deploy

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Link your project (must match `VITE_SUPABASE_URL` in `.env`):

```bash
supabase link --project-ref ixmbfnfwpjwbfahqaftc
```

3. Push database migrations:

```bash
supabase db push
```

4. Deploy functions:

```bash
supabase functions deploy marketplace
supabase functions deploy bookings
supabase functions deploy auth
```

Or deploy all at once:

```bash
supabase functions deploy
```

## Local development

```bash
supabase start
supabase functions serve
```

Point `.env` at your local stack or remote project URL.

## Frontend env

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

If Edge Functions are unavailable, the frontend falls back to sample listings in `src/data/listings.js`.
