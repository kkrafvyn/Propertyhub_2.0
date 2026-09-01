# BaytMiftah REOS - Complete Product Inventory

**Status:** Living implementation inventory

This document records the BaytMiftah product from its marketplace origin through the current Enterprise ERP programme. It is the repository counterpart to the master plan and should be updated whenever a major product capability changes.

## Product definition

BaytMiftah is a Ghana-first Real Estate Operating System connecting marketplace discovery, consumer journeys, agency CRM, transactions, property and estate operations, finance sub-ledger workflows, communications, trust/compliance, automation, AI, and smart-property capabilities.

It is a technology platform. It does not act as a bank, landlord, owner, or universal property manager.

## Product surfaces

- **Public marketplace:** home, search, filters, maps, listing detail, comparison, saved listings, inquiries, reviews, viewings, and property sharing.
- **Consumer app:** account, saved listings, messages, applications, viewings, bookings, leases, payments, wallet, maintenance, documents, notifications, and security.
- **Workspace:** listings, CRM, contacts, leads, shared inbox, tasks, calendar, teams, payments, leases, maintenance, inspections, vendors, documents, finance, automation, AI, integrations, trust, compliance, white label, and estate operations.
- **Administration:** users, organizations, listings, moderation, fraud, trust/KYC review, revenue and payment configuration.
- **Mobile:** responsive experience, PWA, offline listing cache, Android/iOS Capacitor wrappers.

## Platform capabilities already present

### Marketplace and sales lifecycle

`Listing -> inquiry -> lead -> viewing -> offer -> deal -> payment -> lease/booking/completion`

- Search, map discovery, comparison, favorite/save and search alerts.
- Listing, property and media management.
- Inquiry-to-deal-case and shared-inbox workflow.
- Lead, contact, task, calendar, viewing, offer, purchase negotiation and commission tooling.
- Short-stay availability, booking, guest, host and review foundations.

### Identity, trust and compliance

- Supabase authentication with email/password, phone and OAuth plumbing.
- Consumer, host/agent and platform-admin routing; organization roles and permissions.
- KYC workflows, AI guidance, trust review, fraud tooling and compliance controls.
- MFA/session safeguards, secure upload validation, legal acceptance, complaints, cookie consent and policy centre.

### Payments and finance

- PayAngels checkout, verification, receipts, refunds, promotion pricing and payment webhooks.
- Wallet, escrow and organization payout foundations.
- Finance reporting and revenue-management controls.
- Integer minor-unit amounts and provider-reference idempotency for estate payments.

### Estate Operations

- Managed estates, units and time-bound owner/tenant/buyer occupancies.
- Immutable unit charges, payments, reversal-safe records and partial-payment allocations.
- Aged arrears, unit follow-up queue, recurring charge schedules and charge runs.
- Estate issues, SLA targets, status audit events, work orders and chargeable repair-cost foundation.
- Estate notices and per-recipient delivery records.

### Operations and intelligence

- Maintenance requests, vendor management, inspections, documents and smart-device hooks.
- Workflow automation, notifications, communication services and web push foundation.
- AI assistant, recommendation, predictive-analysis, market/location intelligence and reporting screens.
- Localization support and Ghana-first market configuration.

## Phase 2 - Enterprise ERP: Commercial Department Operating System

The next programme connects departments through shared person, property, unit, occupancy, transaction, document and communication records.

```text
Company
|- Property Management: estates, units, occupancies, leases, maintenance, inspections, vendors
|- Finance: charges, payments, installments, arrears, statements, reconciliation, reports
|- Sales: leads, contacts, viewings, offers, deals, commissions
|- Marketing: campaigns, listings, promotions, sources, analytics
`- Client Communications: inbox, notices, SMS, email, WhatsApp, push, service desk
```

### Shared operational chains

```text
Buyer inquiry -> lead -> communication -> viewing -> offer -> payment -> documents -> transaction
Resident contact -> service desk -> issue -> technician -> repair -> cost -> charge -> notice -> payment
```

## Phase 2 build sequence

1. Unit/property/customer 360 views and finance statements.
2. Service Desk: phone, WhatsApp, SMS, email, app and web intake linked to people and units.
3. Full work orders: assignment, quotes, approval, evidence, costs, invoice and repair-to-charge.
4. Resident, owner, vendor and executive portals.
5. Leasing: applications, screening, e-signature, move-in/out, renewals and deposits.
6. Utilities, assets, preventive maintenance, procurement, contracts and budgeting.
7. Executive command centre, risk engine, AI daily briefing and data-migration tooling.

## Differentiators beyond Buildium parity

- Marketplace-to-occupancy lifecycle on one platform.
- Ghana-first mobile money, bank transfer, cash reconciliation, SMS and WhatsApp workflows.
- Offline-first technician/caretaker workflows for entry-level Android devices.
- Multilingual, managed-contact-desk capability.
- Trust/KYC/compliance and local payment workflows integrated into operations.
- Permission-aware AI actions, automated monitoring and eventual smart-estate automation.

## Current technical architecture

- React, TypeScript, Vite, React Router, Tailwind/shadcn/Radix.
- Supabase Postgres, RLS, Auth, Realtime, Storage and Edge Functions.
- PayAngels payments; Vercel hosting; PWA and Capacitor native wrappers.
- Solidity contracts and blockchain verification remain future/deferred capabilities.

## Guardrails

- The unit is the central estate operational record.
- Occupancy roles belong to unit occupancies, never a global user role.
- Financial activity is immutable; corrections use reversals.
- Payments allocate to charges; balances are derived, not stored.
- AI actions respect RLS and require approval for high-risk operations.
- Communications report delivery only after provider confirmation.
