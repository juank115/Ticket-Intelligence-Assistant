import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ─── Body limit: 64 KB is more than enough for any support ticket ─────────────
// The previous 10 MB limit enabled DoS via oversized payloads.
app.use(cors());
app.use(express.json({ limit: '64kb' }));

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Max 10 requests per IP per 60-second window.
// Prevents API key exhaustion and brute-force abuse of the proxy endpoint.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX       = 10;
const rateLimitStore       = new Map(); // ip → { count, resetAt }

function rateLimit(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
    });
  }

  entry.count++;
  next();
}

// ─── Request validation ───────────────────────────────────────────────────────
// Reject requests that are missing required fields or exceed safe sizes.
// MAX_TICKET_CHARS mirrors the frontend limit in security.js.
const MAX_TICKET_CHARS = 12_000; // slightly larger to account for KB context

function validateRequest(req, res, next) {
  const { messages, model, stream } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array required.' });
  }

  if (stream !== true) {
    return res.status(400).json({ error: 'Only streaming requests are accepted.' });
  }

  // Check total content size across all messages
  const totalChars = messages.reduce((sum, m) => {
    return sum + (typeof m.content === 'string' ? m.content.length : 0);
  }, 0);

  if (totalChars > MAX_TICKET_CHARS) {
    return res.status(413).json({
      error: `Request payload too large (${totalChars} chars). Maximum is ${MAX_TICKET_CHARS}.`,
    });
  }

  // Only allow known safe models to be requested
  const ALLOWED_MODELS = [
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-haiku-4-5-20251001',
  ];
  if (model && !ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: `Model '${model}' is not allowed.` });
  }

  next();
}

// ─── Proxy route ──────────────────────────────────────────────────────────────
app.post('/api/claude', rateLimit, validateRequest, async (req, res) => {
  const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(401).json({
      error: 'No API key provided. Set ANTHROPIC_API_KEY in .env or pass via x-api-key header.',
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({
        error: `Anthropic API error: ${response.status}`,
        details: errorBody,
      });
    }

    // Stream the SSE response back to the browser
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Prevent the browser from sniffing the content type
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };

    pump().catch(err => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Failed to connect to Anthropic API',
      details: error.message,
    });
  }
});

// ─── Reject all other routes ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔌 CORS Proxy running on http://localhost:${PORT}`);
  console.log(`   Forwarding /api/claude → https://api.anthropic.com/v1/messages`);
});
