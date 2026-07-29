# BaytMiftah REOS

Production-ready real estate platform for managing properties, listings, deal cases, payments, team collaboration, and trust workflows. Built with React 18, TypeScript, Vite, and Supabase.

## Features

- User authentication with Supabase Auth
- Property and listing management
- Search, saved properties, and inquiry workflows
- Deal case collaboration and team messaging
- Workspace dashboards for operations, finance, and fraud monitoring
- PWA support plus Capacitor wrappers for Android and iOS

## Tech Stack

- Frontend: React 18.3.1 + TypeScript
- Build tool: Vite 6.3.5
- Routing: React Router 7.13.0
- UI: shadcn/ui, Radix UI, MUI
- Styling: Tailwind CSS 4
- Backend: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- Native wrappers: Capacitor 8

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Set up the database and environment:

See [docs/setup/SUPABASE_SETUP.md](./docs/setup/SUPABASE_SETUP.md).

3. Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Testing

Run unit tests:

```bash
npm test
```

Run end-to-end tests (install browsers once per machine):

```bash
npx playwright install chromium
npm run test:e2e
```

Regenerate Supabase types when the database schema changes (requires `SUPABASE_DB_URL` or credentials in root `.env`):

```bash
npm run db:types
```

If the CLI is unavailable, the repo includes `scripts/patch-database-types.py` as a fallback for missing tables.

## Project Structure

```text
src/
|-- app/
|   |-- components/        # Shared React components
|   |-- context/           # Auth and app-level providers
|   |-- pages/             # Route-level pages
|   |-- App.tsx            # Root app shell
|   `-- routes.tsx         # Router configuration
|-- lib/                   # Services and utilities
|-- styles/                # Global styles
`-- test/                  # Vitest setup

supabase/
|-- migrations/            # Database schema and RLS
`-- functions/             # Edge functions

docs/
|-- setup/                 # Environment and integration setup
|-- deployment/            # Launch and mobile deployment guides
|-- implementation/        # Rollout notes and summaries
|-- blockchain/            # Smart contract documentation
`-- reference/             # Planning and design references
```

## Documentation

- **Overview & roadmap:** [docs/APP_OVERVIEW_AND_ROADMAP.md](./docs/APP_OVERVIEW_AND_ROADMAP.md)
- **User roles:** [docs/USER_ROLES.md](./docs/USER_ROLES.md)
- **AI integration:** [docs/AI_INTEGRATION.md](./docs/AI_INTEGRATION.md)
- **International expansion:** [docs/INTERNATIONAL_EXPANSION.md](./docs/INTERNATIONAL_EXPANSION.md)
- **AWS migration plan:** [docs/AWS_MIGRATION_PLAN.md](./docs/AWS_MIGRATION_PLAN.md)
- **Pitch deck:** [docs/BaytMiftah_Pitch.docx](./docs/BaytMiftah_Pitch.docx)
- Setup: [docs/setup/SUPABASE_SETUP.md](./docs/setup/SUPABASE_SETUP.md)
- Deployment checklist: [docs/deployment/PRODUCTION_CHECKLIST.md](./docs/deployment/PRODUCTION_CHECKLIST.md)
- Deployment guide: [docs/deployment/DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md)
- Mobile setup: [docs/deployment/MOBILE_SETUP.md](./docs/deployment/MOBILE_SETUP.md)
- Implementation notes: [docs/implementation/IMPLEMENTATION_COMPLETE.md](./docs/implementation/IMPLEMENTATION_COMPLETE.md)
- Full index: [docs/README.md](./docs/README.md)

## Usage Examples

### Authentication

```typescript
import { useAuth } from '@/app/context/AuthContext'

const { user, signIn, signOut } = useAuth()
```

### Query Listings

```typescript
import { listingService } from '@/lib/listing.service'

const listings = await listingService.searchListings(
  {
    priceMin: 500000,
    priceMax: 1000000,
    bedrooms: 3,
    listingType: 'sale',
  },
  limit,
  offset,
)
```

## Deployment

Use [docs/deployment/PRODUCTION_CHECKLIST.md](./docs/deployment/PRODUCTION_CHECKLIST.md) and [docs/deployment/DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md) for launch planning.

## Original Design

https://www.figma.com/design/XMLQKiaAfFGi2nvodoVeNC/Airbnb-inspired-SVG-app

## License

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md).
