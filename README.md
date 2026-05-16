# Ticket Intelligence Assistant

> AI-powered ticket triage for L2 support engineers. Paste a raw support ticket and receive an instant plain-English summary, root cause analysis, similar past incidents from an internal knowledge base, and a ready-to-send first response -- all streamed in real time.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Retrieval Strategy](#retrieval-strategy)
- [Security](#security)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Design Decisions](#design-decisions)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Features

| Output | Description |
|--------|-------------|
| **Summary** | 3-5 sentence plain-English breakdown: what is broken, who is affected, severity level |
| **Root Cause Analysis** | 2-4 probable root cause categories, each with a technical rationale grounded in ticket evidence |
| **Similar Incidents** | Top 3 matches from a 40-incident knowledge base, scored via weighted token retrieval (local, ~0 ms) |
| **First Response Draft** | Professional, human-tone reply ready to send -- editable in-app with one-click copy to clipboard |

Additional capabilities:

- **Real-time streaming** -- each panel renders progressively as the LLM response arrives via SSE
- **Quick Load** -- five pre-loaded sample tickets for instant testing
- **Responsive layout** -- two-column on desktop, single column on mobile
- **Prompt injection defense** -- multi-layer input sanitization, delimiter wrapping, and output validation
- **Rate limiting** -- 10 requests per IP per 60-second window on the proxy

---

## Quick Start

**Prerequisites:** Node.js 18+ and an [Anthropic API key](https://console.anthropic.com/).

```bash
# 1. Clone and install
git clone https://github.com/juank115/Ticket-Intelligence-Assistant.git
cd Ticket-Intelligence-Assistant
npm install

# 2. Configure your API key
cp .env.example .env
# Edit .env -> set ANTHROPIC_API_KEY=sk-ant-your-key-here

# 3. Start both Vite and the CORS proxy
npm run dev:all
# -> http://localhost:5173
```

**Alternative** -- run Vite and the proxy in separate terminals:

```bash
npm run dev     # Terminal 1 -- Vite dev server on :5173
npm run proxy   # Terminal 2 -- CORS proxy on :3001
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run proxy` | Start Express CORS proxy |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Production build (no source maps) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

---

## Architecture

```
Browser (React + Vite)
  |
  |-- Ticket Input --> Weighted Token Scoring (local, ~0 ms)
  |                    --> Similar Incidents panel
  |
  +-- POST /api/claude --> Vite Dev Proxy --> Express CORS Proxy (:3001)
                                               --> Anthropic API (streaming)
                                               <-- SSE stream piped back
                           <-- Parsed XML --> Summary, Root Causes, First Response
```

### Why a CORS proxy?

The Anthropic API does not set CORS headers, so direct browser requests are blocked. The Express proxy in `server/proxy.js` is a thin forwarding layer with **zero business logic** -- it validates the request, applies rate limiting and security headers, and pipes the streaming response back to the client.

### Data flow

1. User pastes a ticket and clicks **Analyze**
2. `retrieval.js` scores the ticket against the 40-incident KB locally (no network call)
3. `claudeClient.js` sends the ticket + top 3 similar incidents to Claude via the proxy
4. The proxy streams the SSE response back; `parseOutput.js` extracts `<summary>`, `<root_causes>`, and `<first_response>` tags as they arrive
5. Each panel renders progressively -- the UI is never blocked waiting for the full response

---

## Retrieval Strategy

**Algorithm:** Weighted Token Scoring (TF x IDF with field weights)

```
For each incident in the KB:
  score = SUM( TF(token) * IDF(token) * field_weight )
```

| Step | Detail |
|------|--------|
| 1. Tokenize | Lowercase, strip punctuation, remove stop words |
| 2. TF | Term frequency of each token in the query |
| 3. IDF | Inverse document frequency across the 40-incident corpus |
| 4. Field weights | Tags: x1.5 (most signal-dense), Category: x1.2, Title/Description: x1.0 |
| 5. Normalize | Scores mapped to 0-1 range |
| 6. Filter | Discard results below 0.10 confidence threshold |
| 7. Return | Top 3 matches, sorted by score descending |

### Why not embeddings?

| Criterion | Token Scoring | Embeddings |
|-----------|---------------|------------|
| Latency | ~0 ms | 300-500 ms |
| Cost per query | $0 | ~$0.002 |
| Accuracy (40 records) | Sufficient | Better semantic recall |

40 records don't justify the latency and cost of an embedding API call. Weighted token scoring with field weights produces relevant results for this corpus size. Embeddings remain a planned improvement for larger knowledge bases.

---

## Security

The application implements defense in depth across multiple layers:

### Input layer (`src/lib/security.js`)

| Defense | Description |
|---------|-------------|
| **Prompt injection detection** | 16+ regex patterns covering instruction override, role hijacking, jailbreak signatures, delimiter injection, XML structure attacks, and encoded payloads |
| **Unicode sanitization** | Strips RLO/LRO direction overrides, zero-width characters, null bytes, and control characters |
| **Content delimiters** | Ticket text is wrapped in `[TICKET_START]`/`[TICKET_END]` so the model cannot confuse user input with system instructions |
| **Token flooding prevention** | Input capped at 8,000 characters (~2,000 tokens) |

### Output layer

| Defense | Description |
|---------|-------------|
| **Schema validation** | Post-stream check ensures at least 2 of 3 expected XML sections are present -- detects hijacked responses |
| **XSS tag detection** | Rejects responses containing `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, or similar dangerous HTML |
| **Attribute sanitization** | XML parser regex rejects `<`, `>`, `&` in attribute values to prevent attribute breakout |
| **React auto-escaping** | No `dangerouslySetInnerHTML` anywhere in the codebase -- all output rendered via React's default text escaping |

### Proxy layer (`server/proxy.js`)

| Defense | Description |
|---------|-------------|
| **CORS restriction** | Only allows requests from configured localhost origins (configurable via `ALLOWED_ORIGINS`) |
| **Rate limiting** | 10 requests per IP per 60-second window with `Retry-After` headers |
| **Body size limit** | 64 KB max request body |
| **Model whitelist** | Only approved Claude models accepted; parameter is required |
| **Error sanitization** | Raw API errors logged server-side only; clients receive safe, generic messages |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy` |
| **Stream-only enforcement** | Rejects non-streaming requests to prevent request smuggling |
| **Route rejection** | All routes except `POST /api/claude` return 404 |

### Build layer

| Defense | Description |
|---------|-------------|
| **No source maps** | Production builds do not include `.map` files |
| **Secrets excluded** | `.env` and `.env.local` are gitignored; `.env.example` contains only templates |
| **Zero vulnerabilities** | `npm audit` returns 0 vulnerabilities |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19 |
| Build tool | Vite | 8 |
| Styling | Tailwind CSS | 4 |
| LLM | Claude Sonnet 4 | `claude-sonnet-4-20250514` |
| CORS Proxy | Express | 5 |
| Linting | ESLint | 10 |

**Zero external runtime dependencies beyond React, Express, cors, and dotenv.** The retrieval engine and XML parser are custom implementations with no third-party libraries.

---

## Project Structure

```
ticket-intel-assistant/
|-- server/
|   +-- proxy.js                  # Express CORS proxy with rate limiting & security headers
|-- src/
|   |-- App.jsx                   # Application shell, global state, layout
|   |-- main.jsx                  # React entry point
|   |-- index.css                 # Design system (Tailwind + custom properties)
|   |-- components/
|   |   |-- TicketInput.jsx       # Ticket textarea + Quick Load + Analyze button
|   |   |-- SummaryPanel.jsx      # Output: plain-English summary with severity badge
|   |   |-- RootCausePanel.jsx    # Output: root cause categories with rationale
|   |   |-- SimilarIncidents.jsx  # Output: top 3 KB matches with confidence scores
|   |   +-- FirstResponse.jsx     # Output: editable draft + copy to clipboard
|   +-- lib/
|       |-- retrieval.js          # Weighted token scoring (TF x IDF) over KB
|       |-- claudeClient.js       # Streaming API client with retry logic
|       |-- parseOutput.js        # XML tag parser for streamed responses
|       +-- security.js           # Prompt injection defense & input validation
|-- public/
|   +-- incidents_kb.json         # 40 past incidents (knowledge base)
|-- .env.example                  # Environment variable template
|-- sample_tickets.txt            # 5 test tickets for validation
|-- LLMPrompts.md                 # AI usage log & system prompt iterations
|-- eslint.config.js              # ESLint flat config (Node + React)
|-- vite.config.js                # Vite config with proxy & security settings
+-- package.json
```

---

## Configuration

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | -- | Your Anthropic API key (`sk-ant-...`) |
| `PROXY_PORT` | No | `3001` | Port for the Express CORS proxy |
| `ALLOWED_ORIGINS` | No | `localhost:5173,5174,3000` | Comma-separated list of allowed CORS origins |

### API key options

1. **`.env` file** (recommended): Set `ANTHROPIC_API_KEY` in the `.env` file. The proxy reads it automatically.
2. **UI Settings**: Click **API Key** in the header and paste your key. Stored in `localStorage`.

> **Note:** `localStorage` is not secure for production environments. For production deployments, use server-side environment variables exclusively.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Retrieval algorithm | Weighted token scoring | 40 records don't justify embedding API latency/cost; field weights compensate for corpus size |
| Output format | XML tags | Streams better than JSON -- sections become visible as they arrive, enabling progressive rendering |
| Framework | React + Vite | No SSR needed; Vite provides the fastest dev feedback loop for prototyping |
| CORS solution | Express proxy | Anthropic API blocks browser CORS; the proxy is a thin passthrough with zero business logic |
| Response editor | `<textarea>` | More reliable for copy/paste workflows than `contentEditable` |
| LLM model | Claude Sonnet 4 | Optimal balance of streaming performance, structured output reliability, and cost |
| Security approach | Defense in depth | Input sanitization, prompt delimiters, output validation, proxy hardening -- no single point of failure |

---

## Future Improvements

1. **Semantic embeddings** -- `@xenova/transformers` running in a Web Worker for better retrieval accuracy on paraphrased or domain-specific queries
2. **Analysis history** -- persist past analyses in `localStorage` so engineers can review previous ticket triage sessions
3. **Remove CORS proxy** -- deploy on a server-rendered platform (Next.js, Remix) to eliminate the proxy entirely
4. **Ticket categorization** -- auto-detect ticket type (auth, performance, data, integration) and pre-filter the knowledge base
5. **Multi-language support** -- detect ticket language and generate responses in the same language

---

## License

[MIT](LICENSE)
