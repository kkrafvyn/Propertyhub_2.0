# BaytMiftah Product Architecture & Surface Compatibility Model

## 1. Executive Summary

The final operating model for BaytMiftah is a **2-product architecture** built on a shared core platform:

```text
                                                            BAYTMIFTAH CORE
                                                                               │
                                                ┌──────────┴──────────┐
                                                ▼                     ▼
                  CONSUMER PRODUCT        BUSINESS PLATFORM
                  - Consumer Web          - Business Web
                  - Consumer Mobile       - Business Desktop
                                                                                          - Business Mobile
```

Internal admin, platform operations, and trust/safety workflows are treated as **role-aware functions inside the Business Platform**, rather than a separate product family or a separate Admin Mobile app.

The repository still contains a compatibility layer for legacy admin routes and surfaces, but the product intent is now clearly:

- Consumer = personal user product
- Business Platform = all company, property, operations, and internal admin workflows
- No standalone Admin Mobile app

This document reflects the current repository state and the strategic product boundary that the codebase is converging toward.

---

## 2. Current Repository Reality

The app currently supports the full multi-surface runtime described below, but this is intentionally a compatibility layer while the final business model is being enforced.

### Product-level model

| Product | Surfaces | Notes |
|---|---|---|
| Consumer | Consumer Web, Consumer Mobile | Resident / buyer / renter experiences |
| Business Platform | Business Web, Business Desktop, Business Mobile | Company operations, internal staff, admin workflows |

### Role-aware admin placement

Admin users and internal operations staff are routed through the Business Platform rather than creating a fourth app product.

The core routing and access model is therefore:

```text
Login
      ↓
Identify user + role + org context
      ↓
Consumer OR Business Platform
      ↓
Consumer surfaces OR Business surfaces
      ↓
Role-specific dashboard + permission sets
```

This means legacy `/admin` routes may still exist in the repository for compatibility and gradual migration, but they are not the final product boundary.

---

## 3. Surface Matrix & Feature Allocation

| # | Surface ID | Family | Platform | Purpose | Status |
|---|------------|--------|----------|---------|--------|
| 1 | `consumer-web` | Consumer | Web | Public discovery & transactions | Active |
| 2 | `consumer-mobile` | Consumer | Mobile | Consumer tenant & buyer app | Active |
| 3 | `business-web` | Business | Web | Company and operations portal | Active |
| 4 | `business-desktop`| Business | Desktop | Power ERP workspace (Electron) | Active |
| 5 | `business-mobile` | Business | Mobile | Field ops, inspections, contractor workflow | Active |

Legacy admin surfaces may remain visible in code, tooling, and docs as compatibility artifacts, but the canonical product strategy does not treat them as a separate mobile product.

On the shared desktop app, platform admins can open `/admin` and receive the dedicated admin desktop shell. The same protected admin route enforces platform-admin authorization and MFA; desktop access does not bypass those checks.

---

## 4. Real-Time Communication & Calling Suite

BaytMiftah provides a zero-dependency, enterprise-grade unified communication suite:

### 3.1 WebRTC HD Voice & Video Calling
- **Audio & Video Engine**: WebRTC media stream manager (`CallMediaManager`) with noise suppression, echo cancellation, and adaptive bitrate.
- **Audio Synthesizer (`AudioSynthesizer`)**: Web Audio API oscillator synthesis generating harmonic Ghanaian ITU-standard ringtones, chime alerts, and connect tones with zero external MP3 assets.
- **Visualizer**: Real-time frequency bin analysis driving live animated soundwave waveforms on audio calls.
- **Screen Sharing**: Native `getDisplayMedia` screen sharing for contract and blueprint review.
- **Co-Browsing**: Synchronized in-call property tour mode displaying live listings, floor plans, and amenities during calls.
- **Picture-in-Picture & Minimized Pill**: Seamless transition between full-screen stage and floating `ActiveCallBar` allowing simultaneous browsing.

### 3.2 Omnichannel Broadcasts & Messaging
- **Ghana National SMS Gateway**: Hubtel / Arkesel / Twilio routing with sender ID `BAYTMIFTAH`.
- **WhatsApp Business Cloud API**: Verified direct channel for notices, rent reminders, and QR gate passes.
- **Ghana Cellular & WhatsApp Direct Dialers**: `tel:` and `https://wa.me/` fallback integration.

---

## 5. AI Copilot & Multi-Dialect Query Engine

The draggable floating AI Copilot (`BaytMiftahAIPanel`) translates natural language property requests into machine-executable queries across dialects:
- **REOS-QL**: BaytMiftah declarative real-estate query language.
- **PostgreSQL**: Production-grade SQL queries with index hints.
- **Supabase JS**: Type-safe JavaScript client queries.
- **GraphQL**: Schema-validated graph queries.
- **JSON AST**: Structured execution plan with index cost estimates.

---

## 6. Verification & Security

- **E2EE Encryption**: 256-bit encrypted WebRTC media streams.
- **MFA Gate**: Enforced on business and admin surfaces.
- **SurfaceGate**: Declarative React gating preventing unauthorized or non-desktop feature execution.
