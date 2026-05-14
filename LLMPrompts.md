# LLM Prompts Log

## 1. Coding Assistant Usage

### Tools Used
- **Claude Opus 4** via Gemini Code Assist (Antigravity) — project scaffolding, component creation, architecture decisions
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) — in-app LLM for ticket analysis at runtime

### Key Prompts → Outputs → Changes

#### Prompt 1: Project Plan Review
**What I asked:** "Evaluate my PLAN.md for the Nuaav L2 assessment"
**What it produced:** Detailed evaluation identifying a critical CORS issue (Anthropic API blocks browser requests), naming inaccuracy (calling token overlap "TF-IDF"), and optimistic timeline.
**What I changed:** Added Express CORS proxy, renamed retrieval algorithm honestly, adjusted timeline from 4.5h to 6h, added confidence threshold for retrieval.

#### Prompt 2: Scaffolding + Implementation
**What I asked:** "Execute the PLAN.md" — build the full project step by step
**What it produced:** Complete project code: proxy server, retrieval algorithm, streaming client, XML parser, 5 React components, design system
**What I changed/reviewed:**
- Verified the retrieval algorithm uses actual TF×IDF math (not just token overlap)
- Checked error handling covers all 4 scenarios from the plan (401, 429, timeout, stream cut)
- Ensured the streaming parser handles partial XML tags (incomplete stream)
- Verified copy-to-clipboard has fallback for older browsers
- Confirmed API key is stored in localStorage with documented trade-off

#### Prompt 3: System Prompt Design
**What I asked:** Designed as part of the full implementation
**What it produced:** XML-structured system prompt for Claude
**What I changed:** 
- Added explicit instruction "write as a human support engineer, not a bot"
- Added format example showing self-closing `<cause/>` tags for deterministic parsing
- Specified "respond ONLY with XML tags. No preamble" to prevent parsing failures

---

## 2. System Prompt — Iterations

### v1 — Initial Draft
```
You are an expert L2 Support engineer assistant. Analyze the support ticket 
and return structured output in XML tags.

Rules:
- <summary>: 3–5 sentences. What is broken, who is affected, severity.
- <root_causes>: 2–4 categories with rationale.
- <first_response>: Professional reply with next steps.

Format: respond ONLY with the XML tags.
```
**Problem:** Summary was too verbose (7–8 sentences). First response sounded robotic/corporate.

### v2 — Verbosity + Tone Fix
```
Added:
- "3–5 sentences ONLY" (emphasis on limit)
- "No filler phrases"
- "Be specific with numbers and timelines from the ticket"
- "Write as a human support engineer, not a bot"
- "The response should be ready to send without edits"
```
**Problem:** Root causes sometimes fabricated details not in the ticket.

### v3 — Final Version (in production)
```
You are an expert L2 Support engineer assistant at a SaaS platform. Analyze the 
support ticket provided and return structured output in XML tags.

Rules:
- <summary>: 3–5 sentences ONLY. State what is broken, who is affected, and 
  severity level. No filler phrases. Be specific with numbers and timelines 
  from the ticket.
- <root_causes>: 2–4 probable root cause categories. Each must have a one-line 
  technical rationale grounded in evidence from the ticket text. Do not invent 
  details not present in the ticket. Use self-closing tags: 
  <cause category="Category Name" rationale="Technical explanation"/>
- <first_response>: A professional but human reply to the ticket reporter. 
  Include: acknowledgement of urgency matching the ticket severity, concrete 
  next diagnostic steps your team will take, 1–2 clarifying questions if needed, 
  and an estimated follow-up timeline. Write as a human support engineer, not a 
  bot. The response should be ready to send without edits.

You will also receive the top 3 similar past incidents from our knowledge base 
as context. Reference their resolutions where relevant to inform your analysis, 
but do not fabricate incident details.

Format: respond ONLY with the XML tags below. No preamble, no explanation 
outside tags.
```

### Design Justification
- **XML over JSON:** XML tags stream naturally — each section becomes visible as soon as its opening tag arrives. JSON requires the complete object before parsing.
- **Self-closing `<cause/>` tags:** Enables regex-based extraction that works on partial streams. Each cause is independently parseable.
- **KB context injection:** The top 3 similar incidents are passed as context in the user message, not in the system prompt. This keeps the system prompt stable and the context dynamic.
- **"Do not invent" instruction:** Critical for L2 support — fabricated technical details could lead to incorrect troubleshooting steps.

---

## 3. Model Selection

| Context | Model | Reason |
|---------|-------|--------|
| In-app analysis | `claude-sonnet-4-20250514` | Best balance of quality, speed, and streaming UX. Strong at structured XML output. |
| Coding assistant | Claude Opus 4 (via Gemini Code Assist) | Project scaffolding, architecture, code review |

---

## 4. Retrieval Strategy — AI-Assisted Design

The retrieval algorithm (weighted token scoring) was designed with AI assistance but manually reviewed:

**What AI suggested:** Simple token overlap with tag bonus
**What I changed:** 
- Implemented actual TF×IDF math (inverse document frequency over the 40-doc corpus)
- Added field-level weights (tags ×1.5, category ×1.2) instead of flat bonus
- Added minimum confidence threshold (0.10) with empty state UI
- Added stop word removal for better signal-to-noise ratio

**Why not embeddings:** With only 40 records, the latency (~300-500ms) and cost (~$0.002/query) of an embedding API call are not justified. Token scoring produces relevant results for this corpus size. Documented as the #1 improvement for scaling beyond 100+ records.

---

## 5. UI Redesign — Deep Ops Design System

### What I asked
"usa el desing-skill.md para crear la ui" — apply the design skill guidelines to build a distinctive, production-grade UI. The design skill instructs: pick a bold aesthetic direction, avoid generic AI aesthetics (Inter, purple gradients), use unexpected layouts, and commit fully to the chosen direction.

### Aesthetic Direction Chosen: "Deep Ops — Mission Control"
Dark, operational aesthetic inspired by mission control centers and SIEM dashboards. Purposeful for a tool used during P1 incidents:
- Engineers use terminals constantly — dark mode reduces eye strain in long incident sessions
- "Intelligence" branding pairs with forensic/ops center aesthetics
- High-contrast output panels make severity and confidence scores easy to scan at a glance

### What it produced
Full redesign of `index.css` and all 5 components with a new design system:
- **Background:** `#050B18` (deep navy-black) with dot-grid atmospheric overlay
- **Surfaces:** `#0B1628` dark cards with blue-tinted borders
- **Accent:** `#22D3EE` cyan with neon glow on interactive elements
- **Typography:** `Syne` (headers/labels — geometric, authoritative) + `Plus Jakarta Sans` (body) + `JetBrains Mono` (code/IDs)
- **Active streaming:** Scan-line animation across card tops during streaming
- **Progress bars:** Gradient fill with cyan `box-shadow` glow
- **Badges:** P1/P2/P3 with severity-appropriate neon colors and shadow glow
- **Panel headers:** SVG icons replacing emojis, Syne all-caps labels

### What I changed / reviewed
- Replaced emoji panel headers with inline SVG icons (more professional, consistent sizing)
- Changed `btn-primary` text color to `#050B18` (dark) since the button is now cyan — ensures WCAG contrast compliance
- Updated scrollbar colors to match dark theme
- Added `color-scheme: dark` on `:root` for native form element theming
- Updated Google Fonts link in `index.html` to load Syne + Plus Jakarta Sans (removed Inter)
- Verified all 5 sample tickets still analyze correctly with the new UI
- Confirmed build compiles without errors: `✓ built in 291ms`

---

## 6. Assessment Compliance Review

### What I asked
Reviewed `Nuaav_L2_Assessment_Candidate.docx` against the current codebase to verify all requirements were met.

### Critical issue found and fixed
The assessment auto-fail condition states: *"AI outputs are hardcoded — no live LLM call is made."*

A `runMockStream` function had been added to `claudeClient.js` that returned keyword-matched hardcoded XML responses when no API key was configured. This directly violated the auto-fail condition. **The function was removed entirely.**

The correct behavior when no API key is present: the proxy returns HTTP 401, and `claudeClient.js` surfaces the error: *"API key inválida. Configúrala en Settings (⚙) o en el archivo .env del servidor."* — this is graceful error handling, not a bypass.

### Confirmed compliant
- ✅ Text area + Analyze button (`TicketInput.jsx`)
- ✅ All 4 outputs rendered (`SummaryPanel`, `RootCausePanel`, `SimilarIncidents`, `FirstResponse`)
- ✅ Live LLM call via Claude API with streaming (`claudeClient.js`)
- ✅ KB retrieval with confidence score (`retrieval.js` — TF×IDF, displayed as % in UI)
- ✅ Graceful error handling (401, 429, 5xx, network — all handled with user-facing messages + 1 auto-retry)
- ✅ Streaming response (SSE stream piped from Anthropic → proxy → browser, parsed incrementally)
- ✅ Copy-to-clipboard on First-Response Draft (`FirstResponse.jsx`)
- ✅ `LLMPrompts.md` present and documents all prompts + iterations
- ✅ `README.md` covers: setup, API key config, retrieval strategy + why, improvements
