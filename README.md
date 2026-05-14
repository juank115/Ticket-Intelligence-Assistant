# Ticket Intelligence Assistant

AI-powered ticket analysis tool for L2 support engineers. Paste a raw support ticket and instantly receive a plain-English summary, root cause analysis, similar past incidents, and a ready-to-send first response.

## Setup (< 2 minutes)

```bash
# 1. Clone and install
git clone https://github.com/juank115/Ticket-Intelligence-Assistant.git
cd ticket-intel-assistant
npm install

# 2. Configure API key
cp .env.example .env
# Edit .env → ANTHROPIC_API_KEY=sk-ant-your-key-here

# 3. Run (starts Vite + CORS proxy)
npm run dev:all
# → http://localhost:5173
```

**Alternative:** Run Vite and proxy separately in two terminals:
```bash
npm run dev     # Terminal 1 — Vite on :5173
npm run proxy   # Terminal 2 — CORS proxy on :3001
```

## API Key

Two options:

1. **`.env` file** (recommended): Set `ANTHROPIC_API_KEY=sk-ant-...` in the `.env` file. The proxy server reads this automatically.
2. **UI Settings**: Click ⚙️ API Key in the header and paste your key. Stored in `localStorage`.

> **Note:** `localStorage` is not secure for production. This is a documented trade-off for a local assessment tool.

## Architecture

```
Browser (React + Vite)
  │
  ├── Ticket Input → Weighted Token Scoring (local, ~0ms)
  │                   → Similar Incidents panel
  │
  └── POST /api/claude → Vite Dev Proxy → Express CORS Proxy (:3001)
                                            → Anthropic API (streaming)
                                            ← SSE stream piped back
                         ← Parsed XML → Summary, Root Causes, First Response
```

### Why a CORS proxy?

The Anthropic API does not allow direct browser requests (CORS headers are not set). The Express proxy in `server/proxy.js` is ~20 lines with zero business logic — it only forwards requests and pipes the streaming response back.

## Retrieval Strategy

**Algorithm:** Weighted Token Scoring (TF×IDF with field weights)

1. Tokenize the ticket text (lowercase, strip punctuation, remove stop words)
2. Calculate TF (term frequency) for each token in the query
3. Calculate IDF (inverse document frequency) across the 40-incident corpus
4. Score each incident: `score = Σ(TF × IDF × field_weight)`
   - Tags: ×1.5 (most signal-dense field)
   - Category: ×1.2
   - Title/Description: ×1.0
5. Normalize scores to 0–1, filter below 0.10 threshold, return top 3

### Why not embeddings?

| Criterion | Token Scoring | Embeddings |
|-----------|--------------|------------|
| Latency | ~0ms | 300–500ms |
| Cost | $0 | ~$0.002/query |
| Accuracy (40 records) | Sufficient | Better semantic |
| **Decision** | ✅ Chosen | Future improvement |

40 records don't justify the latency and cost of an embedding API call. Token scoring with field weights produces relevant results for this corpus size.

## Tech Stack

- **Frontend:** React 19 + Vite 8
- **Styling:** Tailwind CSS v4
- **LLM:** Claude Sonnet 4 (`claude-sonnet-4-20250514`) via Anthropic API
- **CORS Proxy:** Express 5 + cors
- **Retrieval:** Custom weighted token scoring (in-browser)

## What I'd Improve With More Time

1. **Semantic embeddings** with `@xenova/transformers` running in a Web Worker — better retrieval accuracy, especially for paraphrased or domain-specific queries
2. **Analysis history** persisted in `localStorage` so engineers can review past ticket analyses
3. **Remove CORS proxy** by deploying on a platform with server-side rendering (Next.js, Remix)
4. **Ticket categorization** — auto-detect ticket type (auth, performance, data, etc.) and pre-filter KB
5. **Multi-language support** — detect ticket language and respond in the same language
