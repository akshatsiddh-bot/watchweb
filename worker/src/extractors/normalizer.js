const env = require('../config/env');

// Patterns for content that changes on every load/check but isn't a
// meaningful content change: timestamps, "N seconds ago" counters, view
// counters, session/request IDs, and cache-busting query-like tokens.
const NOISE_PATTERNS = [
  // ISO-ish timestamps: 2026-08-25T10:00:00, 2026-08-25 10:00:00
  /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?\b/g,
  // Relative time phrases: "5 minutes ago", "2 hours ago", "just now"
  /\b\d+\s+(second|minute|hour|day)s?\s+ago\b/gi,
  /\bjust now\b/gi,
  // "Updated: ...", "Last updated ..." lines are noisy metadata, not content
  /\b(last\s+)?updated:?\s*.*$/gim,
  // View/visitor counters: "1,234 views", "42 people viewed this"
  /\b[\d,]+\s+(views?|visitors?|people viewed this)\b/gi,
  // Long hex/uuid-like tokens that are almost certainly generated IDs
  /\b[0-9a-f]{16,}\b/gi,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
];

/**
 * Produces a comparison-ready version of extracted text: collapses
 * whitespace and strips patterns that are noisy rather than meaningful.
 * This is intentionally conservative - it should never remove content that
 * could represent a real change (e.g. it does NOT strip plain numbers,
 * since those may be prices, dates, or counts the user cares about).
 */
function normalizeContent(rawText) {
  let text = rawText;
  for (const pattern of NOISE_PATTERNS) {
    text = text.replace(pattern, '');
  }
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  if (text.length > env.MAX_CONTENT_CHARS) {
    text = text.slice(0, env.MAX_CONTENT_CHARS);
  }
  return text;
}

module.exports = { normalizeContent, NOISE_PATTERNS };
