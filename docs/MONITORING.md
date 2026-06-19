# Monitoring & uptime

## Product analytics (PostHog)

1. Create a project at [posthog.com](https://posthog.com)
2. Set in **Vercel** env:
   - `VITE_POSTHOG_KEY=phc_...`
   - `VITE_POSTHOG_HOST=https://us.i.posthog.com`
3. Redeploy frontend — `src/lib/analytics.js` initializes on load.

Events already tracked: funnel steps (`lead_stage_changed`, etc.) via `trackFunnel()`.

## Error tracking (optional Sentry)

1. Create a Sentry project (React)
2. Set `VITE_SENTRY_DSN=https://...@sentry.io/...` in Vercel
3. `src/lib/monitoring.js` captures unhandled errors when DSN is set

No DSN = no-op (safe for demo).

## Production smoke test

```powershell
# Frontend pages + marketplace edge + cron health
npm run smoke:prod

# With Supabase edge checks (loads from .env if present)
$env:SMOKE_BASE_URL="https://phub-sigma.vercel.app"
npm run smoke:prod
```

Run after every deploy. Wire into GitHub Actions (see `.github/workflows` if added).

## Uptime monitoring

External (recommended):

| Service | What to monitor |
|---------|-----------------|
| [UptimeRobot](https://uptimerobot.com) | `GET https://phub-sigma.vercel.app/` every 5 min |
| Same | `GET .../functions/v1/cron?action=health` on Supabase URL |

Alert on: status ≠ 200, response time > 5s.

## Supabase dashboard

- **Edge Functions → Logs** — marketplace, agent, trust, payments
- **Database → Reports** — connection count, slow queries
- **Auth → Users** — sign-up errors

## Cron job health

```http
GET https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/cron?action=health
```

Schedule nightly full job separately (see `docs/DEPLOY.md`).
