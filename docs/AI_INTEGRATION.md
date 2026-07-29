# BaytMiftah AI Integration

BaytMiftah AI is **integrated across the product** and works **without API keys** using guided local help. When you add an API key for **OpenAI** or **Qwen**, the same surfaces upgrade to smart mode automatically.

Switch providers with `AI_PROVIDER=openai` or `AI_PROVIDER=qwen` in `.env` (and Supabase Edge secrets).

## Where AI appears

| Surface | Context | Capability |
|---|---|---|
| Home (`/`) | `search` | Natural-language property search |
| Search (`/search`) | `search` | Parse queries → filters |
| Property detail | `property` | Listing Q&A, next steps |
| Consumer dashboard (`/app`) | `consumer` | FAQ, journeys, support |
| Workspace sidebar | `workspace` | Copilot panel on every page |
| Workspace AI page | `workspace` | Full chat, recommendations, workflows |
| Mobile home | `search` | Compact AI search panel |

## Architecture

```text
Browser (BaytMiftahAIPanel, AIAssistant, PropertySearch)
        │
        ▼
ai-assistant.service.ts  ──►  Supabase Edge Functions
        │                      ├── parse-search-query  (filters)
        │                      └── ai-assistant        (chat, descriptions)
        │
        └── Local fallback (FAQ, regex parser) when no key or offline
```

### Edge functions

| Function | Purpose | API key required? |
|---|---|---|
| `parse-search-query` | Turn natural language into search filters | No — local regex parser fallback |
| `ai-assistant` | Chat, listing descriptions, document summaries | No — FAQ/template fallback |

Deploy both:

```bash
npm run integrations:wire
npm run supabase:deploy:payments -- --skip-db
```

## Configuration (keys optional)

Add to root `.env` (leave empty to use guided help only):

```env
# Provider: openai | qwen (auto-detected if only one key is set)
AI_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Qwen (Alibaba DashScope)
QWEN_API_KEY=
QWEN_MODEL=qwen-plus
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# Client flags (auto-set by npm run integrations:wire)
VITE_AI_ENABLED=
VITE_AI_PROVIDER=
```

When an AI key is set for the active provider, `npm run integrations:wire` sets `VITE_AI_ENABLED=true` and `VITE_AI_PROVIDER`.

**Never commit real keys.** Server secrets live in Supabase Edge only.

### Switching providers

| Goal | `.env` settings |
|---|---|
| Use OpenAI | `AI_PROVIDER=openai` + `OPENAI_API_KEY` |
| Use Qwen | `AI_PROVIDER=qwen` + `QWEN_API_KEY` |
| Both keys present | Set `AI_PROVIDER` explicitly |
| Guided help only | Leave both keys empty |

After changing provider, run:

```bash
npm run integrations:wire
npm run supabase:deploy:payments -- --skip-db
```

## Modes

| Mode | Badge in UI | Behavior |
|---|---|---|
| **Guided help** | Gray “Guided help” | Local FAQ, regex search parsing, template listing copy |
| **Smart AI** | Green “Smart AI” | OpenAI `gpt-4o-mini` for chat, search, descriptions |

## Planned AI capabilities

| Phase | Feature |
|---|---|
| **Now** | Search parsing, FAQ, listing templates, workspace copilot workflows |
| **Next** | Lead scoring, pricing suggestions, maintenance triage |
| **Later** | RAG over documents, multilingual chat, fraud signal explanations |
| **AWS era** | Amazon Bedrock or SageMaker for regional model hosting (see AWS migration plan) |

## Code references

- `src/lib/ai-assistant.service.ts` — client service
- `src/app/components/ux/BaytMiftahAIPanel.tsx` — shared UI panel
- `src/app/pages/workspace/AIAssistant.tsx` — full workspace assistant
- `supabase/functions/parse-search-query/` — search parser
- `supabase/functions/ai-assistant/` — chat & generation
