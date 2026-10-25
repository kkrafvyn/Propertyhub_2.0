# BaytMiftah brand assets

Forest green: `#0F2922` · Symbol: dot (person) + arc (horizon)

| File | Use |
|------|-----|
| `symbol.svg` | Mark on light backgrounds |
| `symbol-white.svg` | Mark on dark backgrounds |
| `logo-primary.svg` | Symbol + wordmark |
| `logo-stacked.svg` | Centered stacked lockup |
| `logo-inverted.svg` | White on green panel — **source for native splash** |
| `app-icon.svg` | PWA / App Store (512 rounded square) — **source for app icon** |
| `email-logo.svg` | Email header lockup (560×120) — used by all Resend mail |
| `email-template.html` | Local preview (transactional + marketing layouts) |

All production email HTML is built by `supabase/functions/_shared/email-template.ts`:

- **`transactional`** (default) — logo, title band, body, CTA, footer. Used by enrollment, notifications, automation.
- **`marketing`** — hero image, featured listing, insights blocks. Pass `variant: "marketing"` or featured/insights props.
| `splash.svg` | Full-screen splash (`#0F2922` + inverted lockup) |
| `favicon-alt-dot.svg` | Alternate favicon (solid dot) |

Root: `/favicon.svg` (browser tab), `/logo.svg` (default mark)

## Deprecated assets

Prefer the files in the table above for new work. Legacy PNGs under `/icons/` and duplicate lockups may remain for older installs — regenerate with `npm run cap:assets` rather than editing PNGs by hand.

## PWA theme colors

Consumer `manifest.webmanifest` uses forest green `#0F2922` (matches `index.html` `theme-color`). Workspace install uses `manifest.workspace.webmanifest` with navy `#0B2545` — keep each manifest aligned with its shell, not interchangeable.

## Native app (Capacitor)

Splash uses the **`logo-inverted`** lockup (white mark + wordmark on `#0F2922`). App icon uses **`app-icon.svg`**.

Regenerate native PNGs:

```bash
npm run cap:assets
```

Sources live in `assets/splash.svg` and `assets/icon-only.svg`.
