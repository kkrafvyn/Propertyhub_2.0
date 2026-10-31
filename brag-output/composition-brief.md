# Hyperframes Composition Brief: BaytMiftah REOS

## Objective
Create a short launch-style brag video for BaytMiftah (Propertyhub 2.0).

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920×1080 @ 30fps
- Duration: 20 seconds

## Source Material
- Project root: `Propertyhub_2.0`
- Primary files: `index.html`, `src/app/components/marketing/editorial/marketing-editorial.css`, `src/lib/marketing-page-document.ts`, `README.md`, `src/app/pages/admin/PlatformCommandCenter.tsx`
- Product name: BaytMiftah / BaytMiftah REOS
- Tagline / strongest claim: “Every property. One clear picture.”
- Key UI moment: Editorial marketing hero + Platform Command Center header block
- Copy that must appear verbatim:
  - “Every property.”
  - “One clear picture.”
  - “One app for property operations”
  - “The operating system for real estate.”
  - “Command Center”

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film
- Angle: REOS for real estate ops—not a single-feature demo
- Hook: two-line hero slam on dark green
- Outro: BaytMiftah + OS tagline + Get Started
- Avoid: generic SaaS verbs, invented metrics, secrets/env URLs

## Visual Identity
- Background: `#faf8f5`, `#0d1913`
- Text: `#14251d`, `#f5f1e8`
- Accent: `#123b2a`, `#b64f3a`
- Display font: Playfair Display (Google Fonts)
- Body font: Plus Jakarta Sans
- References: `/public/brand/`, marketing editorial CSS tokens

## Storyboard
See `brag-output/brag-plan.md` scenes 1–5 (20s total).

## Audio
- Music: copy from skill `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` when present
- Cue preset: `happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`
- If music file missing: render silent or user-supplied track; document in plan
- SFX: sparse; use skill `assets/sfx/` via Hyperframes selection

## Hyperframes Instructions
Build composition per domain skills. Run `npx hyperframes check` then `npx hyperframes render --output ../brag.mp4` from `brag-output/composition/`.

## Blockers (environment)
- `npx hyperframes` install failed (npm network) on 2026-10-12
- `ffmpeg` not on PATH — required for render and poster bake
