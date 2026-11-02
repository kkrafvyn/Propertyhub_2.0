# App Store Connect — BaytMiftah media & metadata

Two iOS apps share this pipeline:

| App | Bundle ID | Connect upload folder |
|-----|-----------|------------------------|
| **BaytMiftah** (consumer) | `com.baymiftah.app` | [`consumer/connect-upload/`](consumer/connect-upload/) |
| **BaytMiftah Workspace** | `com.baymiftah.workspace` | [`workspace/connect-upload/`](workspace/connect-upload/) |

Official references: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/), [App preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/), [Manage App Store assets](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets/).

---

## Generate pictures & video (this repo)

**Prerequisites:** [ffmpeg](https://ffmpeg.org/) on your PATH; Playwright browsers (`npx playwright install chromium` once).

### App preview video (required style for Apple review)

Apple expects the preview to show **only the app UI** — real navigation, **no** device mockups, brag frames, logos, or marketing overlays ([Guideline 2.3.3](https://developer.apple.com/app-store/review/guidelines/)).

```bash
# One-time: fictional demo listings, leads, booking + journey (Supabase only — not in app code):
npm run apple:provision-store-demo

# Record in-app flows (search → book → checkout → journey / workspace leads → listings → calendar):
npm run apple:record-app-preview -- consumer --demo
npm run apple:record-app-preview -- workspace --demo

# Without demo manifest (generic public UI only):
npm run apple:record-app-preview -- consumer --no-demo

# Local dev instead of production:
# $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:5173"   # run npm run dev in another terminal
# npm run apple:record-app-preview -- consumer

# Re-encode after manual Simulator capture:
# npm run apple:encode-app-preview -- consumer path/to/simulator-recording.mov

npm run apple:validate-store-assets
```

Raw capture: `marketing/apple/{consumer,workspace}/source/in-app-preview.webm`  
Upload file: `connect-upload/app-preview.mp4` (886×1920, 15–30s H.264).

**iOS Simulator (Mac):** Xcode → run app → `xcrun simctl io booted recordVideo ~/Desktop/baytmiftah-preview.mov` → stop after 15–30s → `npm run apple:encode-app-preview -- consumer ~/Desktop/baytmiftah-preview.mov`

### Screenshots (still frames)

Brag exports are optional **marketing stills** only. Prefer **in-app** screenshots from the same recording session or Simulator.

```bash
node scripts/render-brag-variants.mjs --quality high   # optional marketing stills
npm run apple:export-store-assets -- --force           # 1290×2796 JPEGs; preview only if in-app source exists
node scripts/apple/export-store-icons.mjs
```

### What gets produced

| Asset | Apple requirement | Repo path |
|-------|-------------------|-----------|
| **Screenshots** (6.7" / large Dynamic Island class) | **1290 × 2796** JPEG/PNG, no alpha, **1–10** per locale | `screenshots/iphone-6.7/` (all frames) |
| **Upload set** (recommended) | Same sizes, **6** story frames in order | **`connect-upload/01-screenshot.jpg` … `06-screenshot.jpg`** |
| **App preview** | **886 × 1920**, **15–30 s**, H.264, **≤ 500 MB**, `.mp4`/`.mov`/`.m4v` | **`connect-upload/app-preview.mp4`** |
| **App icon** | **1024 × 1024** PNG (from build + `app-store-icon-1024.png`) | `app-store-icon-1024.png` |

App Store Connect **scales** 1290×2796 screenshots down to smaller iPhones when UI is consistent. You still need at least one set that satisfies the **iPhone (Dynamic Island)** requirement; the large 6.7" class set in this repo is the primary upload target.

**App preview resolution is not 1290×2796.** Apple’s *accepted* preview size for the large iPhone class is **886×1920** (portrait). Previews use a different pipeline than screenshots so they display correctly on the product page.

---

## Upload in App Store Connect

1. Open **Apps** → select **BaytMiftah** or **BaytMiftah Workspace**.
2. Open the **version** in **Prepare for Submission** (or edit metadata on a rejected build).
3. **Product Page Information** → **App Previews and Screenshots**.
4. Select **iPhone 6.7" Display** (or **View All Sizes** → large Dynamic Island / 6.7").
5. Drag files from **`connect-upload/`**:
   - Upload **`app-preview.mp4` first** (previews always appear before screenshots on the store).
   - Then **`01-screenshot.jpg` through `06-screenshot.jpg`** in order.
6. Set **poster frame** for the preview (default suggestion: ~5 s into the video).
7. Repeat for **each localization** (start with English).

Optional: **Media Manager** → **Asset Library** to reuse assets across versions.

---

## Metadata URLs (both apps)

| Field | Value |
|-------|--------|
| Marketing URL | https://www.baytmiftah.com |
| Support URL | https://www.baytmiftah.com/contact or mailto:support@baytmiftah.com |
| Privacy Policy | https://www.baytmiftah.com/legal/privacy |

Copy: [`consumer/store-listing.md`](consumer/store-listing.md), [`workspace/store-listing.md`](workspace/store-listing.md).

---

## Review honesty (Guidelines 2.3.3 / 2.3.4)

Brag/Hyperframes assets are **marketing compositions** (device frame + product story). They are valid store marketing when they reflect real product capabilities.

For a smoother review, also capture **native** screenshots from a **TestFlight** build (Simulator or device) for key flows (sign-in, search, portal / workspace home) and replace or mix as needed. Do **not** describe browser-only captures as “simulator” captures.

---

## iPad & Mac

- **iPad:** Required only if the app runs on iPad. Check Xcode **Targeted Device Family**. If iPad is enabled, add 13" **2048×2732** (or 2064×2752) screenshots (native capture or future export script).
- **Mac (Workspace):** Mac App Store builds need **16:10** screenshots (see Apple Mac sizes). Use the Electron Mac build or marketing desktop captures.

---

## After upload

- Processing can take **up to 24 hours** for previews.
- Binary upload (Xcode / CI) is separate: see [`docs/deployment/APPLE_STORE_UPLOAD.md`](../../docs/deployment/APPLE_STORE_UPLOAD.md).
- Consumer iOS CI notes: [`ios/App/ci_scripts/README.md`](../../ios/App/ci_scripts/README.md).
