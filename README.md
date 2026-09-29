# BaytMiftah REOS

Production-ready real estate platform for managing properties, listings, deal cases, payments, team collaboration, and trust workflows. Built with React 19, TypeScript, Vite, and Supabase.

> 📖 **Master Specification:** See [docs/BAYTMIFTAH_DEFINITIVE_MASTER_SPEC_2026.md](./docs/BAYTMIFTAH_DEFINITIVE_MASTER_SPEC_2026.md) for the definitive product site map, role taxonomy, 8-surface architecture, deterministic sub-ledger, and fleet of specialized agentic AI operating system specifications.  
> 📊 **Delivery Report:** See [docs/BAYTMIFTAH_COMPLETE_DELIVERY_REPORT.md](./docs/BAYTMIFTAH_COMPLETE_DELIVERY_REPORT.md) for the full feature audit, test verification, and delivery report.

## Features

- **8-Surface Architecture**: Distinct experiences across 3 product families (Consumer, Business, Admin) for Web, Desktop (Electron), and Mobile (Android/iOS).
- **HD Voice & Video Calling**: WebRTC 256-bit encrypted audio/video calls, screen sharing, in-call chat, and live property co-browsing.
- **Omnichannel Communications**: Ghana SMS gateway (Hubtel/Arkesel), WhatsApp Business Cloud API, and multi-estate broadcast notices.
- **Draggable AI Copilot**: Multi-dialect query engine translating natural requests into REOS-QL, PostgreSQL, Supabase JS, and GraphQL.
- **Enterprise ERP Modules**: General Ledger, Procurement Center, Portfolio Analytics, AI Command Center, Automation Builder, Bulk Operations, and Data Import/Export.
- **Property & Leasing Lifecycle**: Full discover, apply, KYC, pay, lease, and maintenance dispatch workflow.

## Tech Stack

- Frontend: React 19.2.7 + TypeScript
- Build tool: Vite 6.3.5
- Routing: React Router 8.3.0
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

## Mobile Apps (Capacitor)

BaytMiftah uses Capacitor 8 for native **Android** and **iOS** packages (`com.baymiftah.app`).

Full steps: [docs/deployment/MOBILE_SETUP.md](./docs/deployment/MOBILE_SETUP.md).

### Android

```bash
npm run android:sync
npm run android:open
# optional APK: npm run android:build
```

### iOS (Mac + Xcode)

```bash
npm run ios:sync
npm run ios:open
# optional simulator: npm run ios:build:sim
```

Requires a full Xcode install (not Command Line Tools only). Set your Apple Team under Signing & Capabilities before device/TestFlight builds.

## Desktop App (Electron)

BaytMiftah includes an Electron desktop runtime with native windowing, system tray, desktop notifications, and application menu shortcuts.

1. **Run in Desktop Development Mode (with Live Reload):**
   ```bash
   npm run desktop:dev
   ```

2. **Run the Desktop App against the Production Bundle:**
   ```bash
   npm run desktop:start
   ```

3. **Build the Desktop App:**
   ```bash
   npm run desktop:build
   ```

4. **Package macOS installers:**
   ```bash
   npm run desktop:pack:mac
   ```
   This writes an unsigned DMG and ZIP to `dist-desktop/`. Set up Apple signing
   and notarization credentials before distributing outside your development team.

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
