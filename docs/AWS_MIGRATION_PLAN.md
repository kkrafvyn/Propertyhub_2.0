# AWS Migration Plan

BaytMiftah currently runs on **Vercel (frontend)** + **Supabase (backend)**. This is the right stack for fast iteration and low ops overhead at launch. As traffic, compliance, and enterprise contracts grow, we will **progressively migrate** critical workloads to **Amazon Web Services (AWS)** without a risky big-bang cutover.

## Why migrate (future)

| Driver | Benefit on AWS |
|---|---|
| **Scale** | Auto-scaling compute, RDS/Aurora for Postgres at volume |
| **Regional presence** | Deploy closer to users in Nigeria, Kenya, South Africa, UAE |
| **Enterprise sales** | SOC2-friendly VPC, private networking, dedicated environments |
| **Cost at scale** | Reserved instances, S3 lifecycle, CloudFront CDN optimization |
| **AI workloads** | Bedrock, SageMaker, or self-hosted models in-region |
| **Data residency** | Per-country data boundaries for regulated markets |

## Current vs target architecture

### Today (Phase 0 — Live)

```text
Vercel CDN  →  React SPA
Supabase    →  Postgres, Auth, Storage, Edge Functions, Realtime
Paystack    →  Africa payments
```

### Target (Phase 3 — Multi-region REOS)

```text
CloudFront + S3  →  Static web & mobile web assets
AWS Amplify or ECS/Fargate  →  SSR/API BFF (optional)
Amazon RDS (Aurora PostgreSQL)  →  Primary database
Amazon Cognito + custom JWT  →  Auth (or hybrid with Supabase during transition)
S3  →  Property media, documents, receipts
Lambda + API Gateway  →  Payments webhooks, notifications, AI orchestration
Amazon SES / Pinpoint  →  Email & SMS
Amazon Bedrock  →  AI assistant (regional models)
ElastiCache Redis  →  Sessions, rate limits, search cache
```

## Migration phases

### Phase 1 — Hybrid (0–6 months after scale trigger)

**Trigger:** >50k MAU, enterprise contract requiring VPC, or Supabase cost threshold.

| Workload | Action |
|---|---|
| Media files | Move `property-media` bucket to **S3 + CloudFront**; keep Supabase URLs as redirect |
| Edge functions | Port Paystack/Stripe webhooks to **Lambda** behind API Gateway |
| Email | **Amazon SES** replaces Resend for transactional mail |
| Monitoring | **CloudWatch** + Sentry; AWS X-Ray for latency tracing |
| Secrets | **AWS Secrets Manager** for payment and AI keys |

Supabase remains source of truth for Postgres and auth during Phase 1.

### Phase 2 — Data plane (6–12 months)

| Workload | Action |
|---|---|
| Database | **Logical replication** Supabase Postgres → Aurora PostgreSQL |
| Read replicas | Aurora read replicas per region (e.g. `eu-west-1`, `af-south-1`) |
| Search | **OpenSearch** for listing search (replace client-side filters at scale) |
| Realtime | **API Gateway WebSocket** or AppSync for chat/notifications |
| Background jobs | **SQS + Lambda** for automations, webhooks, MLS sync |

Dual-write period with feature flags; rollback path to Supabase.

### Phase 3 — Full AWS (12–18 months)

| Workload | Action |
|---|---|
| Auth | Cognito user pools or Auth0 on AWS; migrate sessions |
| Decommission Supabase | After 30-day stable AWS-only period |
| Multi-region | Active-passive or active-active per country cluster |
| AI | Bedrock Claude/Llama for in-region inference; no OpenAI egress dependency |
| Compliance | WAF, Shield, KMS encryption, audit logs to S3 |

## What stays the same

- **React + Vite** frontend codebase (deploy target changes, not app logic)
- **Domain** `baytmiftah.com` on Route 53 + CloudFront
- **Paystack** for West Africa; Stripe for international cards
- **Role model, workspace permissions, consumer journeys** — no product rewrite

## Risk mitigation

| Risk | Mitigation |
|---|---|
| Downtime during cutover | Blue/green deployments; dual-write; feature flags |
| Data loss | Point-in-time recovery on Aurora; migration dry-runs |
| Auth session break | Gradual token migration; forced re-login window |
| Cost overrun | Start with S3 + Lambda + SES only; add Aurora when DB load justifies |

## Decision checklist (when to start Phase 1)

- [ ] Monthly active users > 50,000
- [ ] Enterprise customer requires data in specific AWS region
- [ ] Supabase monthly bill exceeds internal threshold
- [ ] Need sub-100ms search at >100k listings
- [ ] Regulatory requirement for in-country data storage

## Estimated effort

| Phase | Engineering | Calendar |
|---|---|---|
| Phase 1 (hybrid) | 4–6 engineer-weeks | 1–2 months |
| Phase 2 (data plane) | 8–12 engineer-weeks | 3–4 months |
| Phase 3 (full AWS) | 12–16 engineer-weeks | 4–6 months |

---

*This is a forward-looking plan. No AWS migration is required for current production operations.*
