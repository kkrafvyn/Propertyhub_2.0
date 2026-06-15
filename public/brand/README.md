# BaytMiftah brand assets

Forest green: `#0F2922` · Symbol: dot (person) + arc (horizon)

| File | Use |
|------|-----|
| `symbol.svg` | Mark on light backgrounds |
| `symbol-white.svg` | Mark on dark backgrounds |
| `logo-primary.svg` | Symbol + wordmark |
| `logo-stacked.svg` | Centered stacked lockup |
| `logo-tagline.svg` | With “Unlocking property opportunities” |
| `logo-inverted.svg` | White on green panel — **source for native splash** |
| `app-icon.svg` | PWA / App Store (512 rounded square) — **source for app icon** |
| `social-icon.svg` | Profile avatar (circle) |
| `email-logo.svg` | Email header (560×120) |
| `email-template.html` | Starter HTML email with logo slot |
| `splash.svg` | Full-screen splash (`#0F2922` + inverted lockup) |
| `favicon-alt-dot.svg` | Alternate favicon (solid dot) |

Root: `/favicon.svg` (browser tab), `/logo.svg` (default mark)

## Native app (Capacitor)

Splash uses the **`logo-inverted`** lockup (white mark + wordmark on `#0F2922`). App icon uses **`app-icon.svg`**.

Regenerate native PNGs:

```bash
npm run cap:assets
```

Sources live in `assets/splash.svg` and `assets/icon-only.svg`.
