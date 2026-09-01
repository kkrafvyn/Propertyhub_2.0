# BaytMiftah Buildium-Surpass To-Do List

Based on the current master specification and the current app codebase as of 2026-08-22.

## Already In The App

- [x] General ledger workspace
- [x] Bank reconciliation workspace
- [x] Payables and vendor bill workflow
- [x] Procurement request-to-PO-to-receipt workflow
- [x] Lease screening queue and renewal actions
- [x] Lease deposit and move checklist workflow
- [x] Owner statement generation and delivery queue
- [x] Service desk / operational case queue
- [x] Contextual inbox / communications hub
- [x] Customer 360, Property 360, and Unit 360 views
- [x] AI command and automation surfaces
- [x] Maintenance / work order / contractor workflows

## Wave 1: Finish Buildium Parity

- [ ] Full accounting engine
  - [ ] Chart of accounts depth
  - [ ] Double-entry journals across all modules
  - [ ] Accounting periods and period locking
  - [ ] Reversals and audit-safe corrections
  - [ ] General ledger, AP, AR, and owner accounting in one accounting core
  - [ ] Property-level P&L, portfolio P&L, balance sheet, income statement, cash flow
  - [ ] Budget vs actual reporting
  - [ ] Accounting exports and audit packs

- [ ] Bank reconciliation maturity
  - [x] Manual statement upload and matching
  - [x] CSV feed import helper
  - [ ] Live bank feeds / provider sync
  - [ ] Matching rules engine
  - [ ] Exception handling queue
  - [ ] Period close after reconciliation

- [ ] Ownership accounting
  - [ ] Multiple owners per property
  - [ ] Ownership percentages
  - [ ] Owner contributions and draws
  - [ ] Distribution approval workflow
  - [ ] Owner-level financial statements

- [ ] Full leasing engine
  - [x] Screening queue
  - [x] Lease renewals
  - [x] Deposit workflow
  - [x] Move checklist
  - [ ] Public application flow
  - [ ] Application intake and approvals
  - [ ] eSignature integration
  - [ ] Deposit settlement and move-out closeout

- [ ] Maintenance parity
  - [x] Work orders and contractor dispatch
  - [x] Service desk handoff
  - [ ] Recurring work templates
  - [ ] Projects and staff time tracking
  - [ ] Material tracking
  - [ ] Quotes and vendor comparison
  - [ ] Maintenance calendar
  - [ ] Property inspections and cost analytics

## Wave 2: Make The Core Better Than Buildium

- [ ] Owner-Operator mode
  - [ ] Self-managed / professionally managed / hybrid property modes
  - [ ] Owner can operate selected properties directly
  - [ ] Separate permissions by property and role

- [ ] Universal Customer 360
  - [x] Customer 360 page exists
  - [ ] One canonical record across leads, deals, leases, payments, maintenance, and documents
  - [ ] Remove duplicate person records across departments

- [ ] Unit 360
  - [x] Unit 360 page exists
  - [ ] Make unit the central operating record for all financial and operational data

- [ ] Property 360
  - [x] Property 360 page exists
  - [ ] Add a complete risk, AI health, and operational summary layer

- [ ] Contractor intelligence
  - [ ] Skill-based dispatch
  - [ ] SLA-based contractor matching
  - [ ] Quote intelligence across price, ETA, quality, and history
  - [ ] Root-cause incident grouping

- [ ] Communications superiority
  - [x] Contextual inbox exists
  - [x] Service desk exists
  - [ ] Message-to-action routing across customer, property, unit, and case
  - [ ] Communication escalation chains
  - [ ] Unified conversation context for every record

## Wave 3: AI-Native Operations

- [ ] Specialist agent fleet
  - [ ] Property Agent
  - [ ] Leasing Agent
  - [ ] Finance Agent
  - [ ] Collections Agent
  - [ ] Maintenance Agent
  - [ ] Contractor Agent
  - [ ] Sales Agent
  - [ ] Marketing Agent
  - [ ] Customer Service Agent
  - [ ] Communication Agent
  - [ ] Executive Agent

- [ ] Multi-agent workflows
  - [ ] Cross-domain orchestration from lead to lease to payment to maintenance
  - [ ] Shared task handoffs and approval routing

- [ ] AI Night Watch
  - [ ] Arrears detection
  - [ ] Failed payment detection
  - [ ] SLA breach detection
  - [ ] Vacancy and lease-expiry monitoring
  - [ ] Contractor delay and cost anomaly monitoring
  - [ ] Failed automation and failed integration detection

- [ ] AI governance
  - [ ] Permission matrix per agent
  - [ ] Action ledger for every important AI action
  - [ ] AI budgets and kill switches
  - [ ] Evidence for AI outputs

## Wave 4: Make It More Usable

- [ ] Role-specific cockpits
  - [ ] Executive Cockpit
  - [ ] Property Manager Cockpit
  - [ ] Finance Cockpit
  - [ ] Sales Cockpit
  - [ ] Maintenance Cockpit
  - [ ] Customer Service Cockpit
  - [ ] Owner Cockpit

- [ ] Exception Center
  - [ ] SLA breaches
  - [ ] Payment exceptions
  - [ ] AI failures
  - [ ] Automation failures
  - [ ] Integration failures
  - [ ] Security events

- [ ] Approval Center
  - [ ] Financial approvals
  - [ ] Contractor approvals
  - [ ] Procurement approvals
  - [ ] Lease approvals
  - [ ] AI approvals
  - [ ] Refund approvals

- [ ] Natural-language ERP
  - [ ] “What needs my attention?”
  - [ ] “Show overdue units.”
  - [ ] “Prepare this month’s owner reports.”
  - [ ] “Why are maintenance costs rising?”

- [ ] Next-best-action guidance on key records

## Wave 5: Become A Serious SaaS Platform

- [ ] SaaS subscription engine
  - [ ] Plans, entitlements, usage limits, trials, upgrades, and invoicing

- [ ] Customer onboarding
  - [ ] Contract
  - [ ] Organization setup
  - [ ] Import
  - [ ] AI mapping
  - [ ] Validation
  - [ ] Configuration
  - [ ] Pilot
  - [ ] Go-live
  - [ ] Hypercare

- [ ] Customer health scoring
  - [ ] Adoption
  - [ ] Active users
  - [ ] Module usage
  - [ ] AI usage
  - [ ] Automation usage
  - [ ] Support volume
  - [ ] Payment status
  - [ ] Renewal risk

- [ ] API platform
  - [ ] Developer portal
  - [ ] API keys
  - [ ] OAuth
  - [ ] Webhooks
  - [ ] Rate limits
  - [ ] SDKs
  - [ ] Logs
  - [ ] Documentation

- [ ] Integration marketplace
  - [ ] Accounting
  - [ ] Payments
  - [ ] CRM
  - [ ] Messaging
  - [ ] Insurance
  - [ ] IoT
  - [ ] Identity
  - [ ] Analytics

## Wave 6: Production Hardening

- [ ] System Command Center for admins
- [ ] Service health dashboard
- [ ] CI/CD pipeline visibility
- [ ] Environment isolation
- [ ] Observability
  - [ ] Logs
  - [ ] Metrics
  - [ ] Traces
  - [ ] Error monitoring
  - [ ] Uptime
  - [ ] Queue health
  - [ ] Provider health
- [ ] Disaster recovery
  - [ ] RPO
  - [ ] RTO
  - [ ] Backup schedules
  - [ ] Restore tests
  - [ ] Disaster drills
- [ ] Incident management
- [ ] Tenant isolation testing in CI

## Wave 7: Moat

- [ ] Marketplace to ERP flow
- [ ] Universal consumer identity
- [ ] Owner self-management progression
- [ ] Ghana-first infrastructure refinement
- [ ] Cross-company network with controlled permissions

## Practical Next Build Order

1. Finish the full accounting engine and period controls.
2. Add live bank feeds and reconciliation automation.
3. Complete owner accounting and payout workflows.
4. Finish the leasing application, screening, and e-sign flow.
5. Deepen maintenance with templates, inspections, and recurring jobs.
6. Expand communications into message-to-action and escalation.
7. Add the SaaS control plane, API, and tenant health.
8. Finish DevOps, observability, and disaster recovery.

