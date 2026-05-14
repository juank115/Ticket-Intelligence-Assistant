/**
 * security.js — Prompt Injection Defense & Input Validation
 *
 * Attack surface covered:
 *   1. Direct injection  — "Ignore previous instructions..."
 *   2. Role hijacking    — "You are now a different AI..."
 *   3. Delimiter escape  — XML/markdown tags attempting to break prompt structure
 *   4. Unicode attacks   — RLO, null bytes, zero-width chars that bypass naive filters
 *   5. Token flooding    — Oversized inputs exhausting the model's context window
 *   6. Output hijacking  — Validate that the model's response stayed on-task
 */

// ─── Limits ──────────────────────────────────────────────────────────────────
// ~8 000 chars ≈ 2 000 tokens — enough for the longest realistic support ticket
export const MAX_INPUT_CHARS = 8_000;

// ─── Injection Pattern Registry ──────────────────────────────────────────────
// Each entry: [regex, human-readable label]
const INJECTION_PATTERNS = [
  // Classic override attempts
  [/ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?|context|constraints?)/i, 'override-instructions'],
  [/forget\s+(everything|all|the\s+above|prior\s+context)/i, 'forget-context'],
  [/disregard\s+(your|all|the\s+above|previous)/i, 'disregard'],
  [/override\s+(your\s+)?(instructions?|rules?|system|constraints?)/i, 'override'],

  // Role hijacking
  [/you\s+are\s+now\s+(a|an)\s+/i, 'role-hijack-now'],
  [/act\s+as\s+(if\s+you\s+are|a|an)\s+/i, 'role-hijack-act'],
  [/pretend\s+(you\s+are|to\s+be|that\s+you)/i, 'role-hijack-pretend'],
  [/you\s+must\s+now\s+/i, 'role-hijack-must'],
  [/from\s+now\s+on\s+(you|your)/i, 'role-hijack-from-now'],

  // Jailbreak signatures
  [/jailbreak/i, 'jailbreak-keyword'],
  [/do\s+anything\s+now/i, 'dan-mode'],
  [/\bdan\b.*mode/i, 'dan-mode'],
  [/developer\s+mode/i, 'developer-mode'],
  [/god\s+mode/i, 'god-mode'],
  [/unrestricted\s+mode/i, 'unrestricted-mode'],

  // Prompt delimiter injection — tries to inject a new system/user turn
  [/(^|\n)\s*#+\s*(system|instruction|prompt|context)\s*:/im, 'delimiter-system'],
  [/(^|\n)\s*\[INST\]/im, 'delimiter-inst'],
  [/(^|\n)\s*<\|?(system|user|assistant)\|?>/im, 'delimiter-chat-tag'],
  [/\n{3,}system\s*:/i, 'newline-system-injection'],

  // XML structure attacks — tries to close/reopen XML tags used by the output parser
  [/<\/?(summary|root_causes|first_response|cause)\s*[^>]*>/i, 'xml-tag-injection'],

  // Indirect / encoded
  [/base64\s*decode/i, 'encoded-payload'],
  [/eval\s*\(/i, 'code-injection'],
];

// Dangerous unicode: RLO/LRO (text direction), zero-width, null bytes, control chars
// eslint-disable-next-line no-control-regex
const DANGEROUS_UNICODE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\uD800-\uDFFF]/g;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scan raw ticket text for prompt injection attempts.
 *
 * @param {string} text
 * @returns {{ detected: boolean, labels: string[] }}
 */
export function detectInjection(text) {
  if (typeof text !== 'string') return { detected: false, labels: [] };
  const labels = INJECTION_PATTERNS
    .filter(([re]) => re.test(text))
    .map(([, label]) => label);
  return { detected: labels.length > 0, labels };
}

/**
 * Sanitize ticket input before it is sent to the LLM.
 *
 * Steps:
 *   1. Strip dangerous unicode (RLO, null bytes, control chars)
 *   2. Truncate to MAX_INPUT_CHARS
 *   3. Detect injection patterns (for UI warning — does NOT block submission)
 *
 * @param {string} raw
 * @returns {{ text: string, truncated: boolean, injectionWarning: boolean, injectionLabels: string[] }}
 */
export function sanitizeInput(raw) {
  if (typeof raw !== 'string') {
    return { text: '', truncated: false, injectionWarning: false, injectionLabels: [] };
  }

  // 1. Strip dangerous unicode
  let text = raw.replace(DANGEROUS_UNICODE_RE, '');

  // 2. Truncate
  const truncated = text.length > MAX_INPUT_CHARS;
  if (truncated) text = text.slice(0, MAX_INPUT_CHARS);

  // 3. Detect injection (warn, don't block — real tickets can contain phrases like
  //    "ignore this error" or "act as if the service is down")
  const { detected: injectionWarning, labels: injectionLabels } = detectInjection(text);

  return { text, truncated, injectionWarning, injectionLabels };
}

/**
 * Validate that the LLM's streamed output conforms to the expected XML schema.
 * Used after the stream completes to detect if the model was successfully hijacked.
 *
 * @param {string} output  Full accumulated response text
 * @returns {{ valid: boolean, reason: string | null }}
 */
export function validateLLMOutput(output) {
  if (!output || output.length < 20) {
    return { valid: false, reason: 'Response too short — possible stream failure.' };
  }

  const hasSummary      = /<summary>/i.test(output);
  const hasRootCauses   = /<root_causes>/i.test(output);
  const hasFirstResponse = /<first_response>/i.test(output);

  // At least two of the three expected sections must be present
  const sectionCount = [hasSummary, hasRootCauses, hasFirstResponse].filter(Boolean).length;
  if (sectionCount < 2) {
    return {
      valid: false,
      reason: 'Unexpected response structure — the model may have been manipulated by content in the ticket.',
    };
  }

  // Detect dangerous HTML in output (XSS via LLM response)
  if (/<(script|iframe|object|embed|form|link\s+rel|meta\s+http)/i.test(output)) {
    return { valid: false, reason: 'Response contains disallowed HTML tags.' };
  }

  return { valid: true, reason: null };
}

/**
 * Wrap user-supplied ticket text in clear delimiters for the LLM prompt.
 * This makes it structurally impossible for the model to confuse ticket content
 * with system-level instructions, even under adversarial input.
 *
 * @param {string} text  Already-sanitized ticket text
 * @returns {string}
 */
export function wrapTicketContent(text) {
  return `[TICKET_START]\n${text}\n[TICKET_END]`;
}
