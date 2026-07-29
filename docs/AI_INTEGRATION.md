# BaytMiftah AI Integration

BaytMiftah AI is **integrated across the product** and works **without API keys** using guided local help. When you add `OPENAI_API_KEY`, the same surfaces upgrade to smart mode automatically.

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

| Function | Purpose | OpenAI required? |
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
# Optional — smart mode
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
VITE_OPENAI_ENABLED=
```

When `OPENAI_API_KEY` is set, `npm run integrations:wire` sets `VITE_OPENAI_ENABLED=true`.

**Never commit real keys.** Server secret `OPENAI_API_KEY` lives in Supabase Edge secrets only.

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
