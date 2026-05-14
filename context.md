# context.md — Estado actual del proyecto

> Última actualización: 2026-05-14 17:00 CST

---

## Progreso por Fase

### ✅ Fase 1–4 — COMPLETADAS (código funcional)
Todos los componentes, lib modules, proxy, y configuración están creados.

### ✅ Limpieza
- [x] `index.html` actualizado (title, meta, emoji favicon, Google Fonts preconnect)
- [x] `App.css` eliminado
- [x] `package.json` — scripts `proxy` y `dev:all` agregados

### ✅ Fase 5 — Documentación — COMPLETADA
- [x] `LLMPrompts.md` — prompt iterations, design justifications, model selection, security review
- [x] `README.md` — setup, architecture, retrieval strategy, tech stack

### ✅ Fase 6 — QA — COMPLETADA
- [x] `npm run dev` compila sin errores (Vite 8 ~640ms)
- [x] `npm run proxy` inicia correctamente en :3001
- [x] Browser testing con Quick Load + sample tickets verificado

### ✅ Fase 7 — Rediseño UI (Claude Design System)
- [x] `index.css` — paleta Claude (fondo crema `#F0EDE6`, acento terracota `#CC785C`)
- [x] `App.jsx` — header con logo SVG minimalista, layout actualizado
- [x] `SimilarIncidents.jsx` — tags y IDs en acento terracota
- [x] Google Fonts via `<link>` en `index.html` (Inter + JetBrains Mono)
- [x] Sin warnings de PostCSS

### ✅ Fase 8 — Assessment Compliance Review
- [x] Auto-fail eliminado: `runMockStream` (hardcoded responses) removido de `claudeClient.js`
- [x] `LLMPrompts.md` actualizado con secciones 5 y 6 (design system + compliance review)
- [x] Todos los Must Have y Auto-Fail verificados ✅

### ✅ Fase 9 — Seguridad / Prompt Injection Defense — COMPLETADA
- [x] `src/lib/security.js` — módulo nuevo, 4 funciones públicas
- [x] `claudeClient.js` — integra las 3 capas de defensa frontend
- [x] `server/proxy.js` — hardenizado (rate limiting, body limit, model allowlist)

### ✅ Fase 10 — WebGL Shader Wallpaper + Dark Glass UI — COMPLETADA
- [x] `src/wallpaper/shaders.js` — 5 shaders GLSL como módulo ESM (aurora, plasma, voronoi, neon, mercury)
- [x] `src/wallpaper/Wallpaper.jsx` — componente React con WebGL, ResizeObserver, RAF loop, mouse easing, click ring buffer
- [x] `src/design-canvas/` — archivos de referencia (design-canvas.jsx, shaders.jsx, app.jsx, Shader Wallpapers.html)
- [x] `App.jsx` — `<Wallpaper shaderKey={shaderKey} />` fijado (position:fixed, z-index:0); contenido en z-index:1
- [x] `App.jsx` — selector de shader en el header (5 opciones, persiste en localStorage)
- [x] `index.css` — tema Dark Glass Morphism: superficies `rgba(8,5,18,0.72)` con `backdrop-filter: blur(20px)`
- [x] `index.css` — `color-scheme: dark`, placeholder dark-mode, scrollbar adaptado

---

## Arquitectura de Seguridad (Fase 9)

### Superficie de ataque cubierta

| Vector | Mitigación |
|---|---|
| Prompt injection directa ("ignore previous...") | `detectInjection()` — 22 patrones regex + warning en UI |
| Unicode malicioso (RLO, null bytes, zero-width) | `sanitizeInput()` — strip con regex de rangos Unicode peligrosos |
| Token flooding (input gigante) | `sanitizeInput()` — trunca a 8 000 chars; proxy rechaza >12 000 |
| Delimiter injection (tags XML en el ticket) | Regex en `INJECTION_PATTERNS` + delimitadores `[TICKET_START/END]` |
| Model hijacking (output fuera de esquema XML) | `validateLLMOutput()` — requiere ≥2 de 3 tags esperados |
| XSS via respuesta del modelo | Validación de tags HTML peligrosos (`<script>`, `<iframe>`, etc.) |
| Role hijacking ("you are now...") | Instrucción explícita en system prompt + 8 patrones de detección |
| DoS via proxy (requests masivos) | Rate limit: 10 req / 60s por IP |
| Payload oversized al proxy | Body limit: 64 KB (antes 10 MB) |
| Modelos no autorizados | Allowlist en proxy: solo modelos Claude conocidos |

### Capas implementadas

```
[CAPA 1 — INPUT]  sanitizeInput(ticketText)
                   → strip unicode peligroso
                   → truncar a MAX_INPUT_CHARS (8 000)
                   → detectar patrones de inyección (warning, no block)

[CAPA 2 — PROMPT] wrapTicketContent(text)
                   → envuelve ticket en [TICKET_START] / [TICKET_END]
                   → system prompt con sección SECURITY BOUNDARY explícita

[CAPA 3 — PROXY]  rateLimit middleware (10 req/min/IP)
                   validateRequest middleware (size, stream flag, model allowlist)
                   Body limit 64 KB

[CAPA 4 — OUTPUT] validateLLMOutput(accumulated)
                   → verifica estructura XML esperada
                   → detecta tags HTML peligrosos
                   → si inválido → onError (retryable: true)
```

---

## Archivos completos del proyecto

```
ticket-intel-assistant/
├── server/proxy.js              ✅ (rate limit, body 64KB, model allowlist)
├── src/
│   ├── components/
│   │   ├── TicketInput.jsx      ✅
│   │   ├── SummaryPanel.jsx     ✅
│   │   ├── RootCausePanel.jsx   ✅
│   │   ├── SimilarIncidents.jsx ✅ (tags terracota)
│   │   └── FirstResponse.jsx    ✅
│   ├── lib/
│   │   ├── retrieval.js         ✅
│   │   ├── claudeClient.js      ✅ (security layers 1-2 + 4)
│   │   ├── security.js          ✅ NEW — prompt injection defense
│   │   └── parseOutput.js       ✅
│   ├── wallpaper/
│   │   ├── Wallpaper.jsx        ✅ NEW — WebGL shader background component
│   │   └── shaders.js           ✅ NEW — 5 GLSL fragment shaders (ESM)
│   ├── design-canvas/           ✅ archivos de referencia (no modificados)
│   ├── App.jsx                  ✅ (Dark Glass + Wallpaper + shader picker)
│   ├── index.css                ✅ (Dark Glass Morphism tokens)
│   └── main.jsx                 ✅
├── public/incidents_kb.json     ✅ (sin modificar)
├── .env.example                 ✅
├── index.html                   ✅ (Google Fonts preconnect)
├── package.json                 ✅
├── sample_tickets.txt           ✅ (sin modificar)
├── vite.config.js               ✅
├── LLMPrompts.md                ✅
├── README.md                    ✅
└── context.md                   ✅
```

## Estado final
- Flujo completo contra Claude Sonnet 4 con API key real
- UI Dark Glass Morphism sobre fondo WebGL interactivo (5 shaders)
- Shader picker en el header, persiste selección en localStorage
- Prompt injection defense en 4 capas (frontend + proxy)
- `npm run dev:all` — inicia todo en un comando
- App corriendo en http://localhost:5175 (Vite) + http://localhost:3001 (proxy)
