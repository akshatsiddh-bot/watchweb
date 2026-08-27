// Currency symbols/codes commonly seen on product/price pages.
const PRICE_PATTERN = /(?:₹|\$|€|£|Rs\.?|INR|USD|EUR|GBP)\s?[\d,]+(?:\.\d+)?/i;

const AVAILABILITY_KEYWORDS = [
  'in stock',
  'out of stock',
  'sold out',
  'available',
  'unavailable',
  'currently unavailable',
  'back in stock',
  'pre-order',
  'preorder',
  'limited stock',
];

function containsAvailabilityKeyword(text) {
  const lower = text.toLowerCase();
  return AVAILABILITY_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractPrices(text) {
  return (text.match(new RegExp(PRICE_PATTERN, 'gi')) || []).map((p) => p.trim());
}

/**
 * Classifies a change based on the structured diff and the raw before/after
 * text. Order matters: more specific classifications (price, availability)
 * are checked before falling back to generic text add/remove/modify.
 */
function classifyChange(diffParts, beforeText, afterText) {
  const added = diffParts.filter((p) => p.type === 'added').map((p) => p.value).join(' ');
  const removed = diffParts.filter((p) => p.type === 'removed').map((p) => p.value).join(' ');

  const hasAdded = added.trim().length > 0;
  const hasRemoved = removed.trim().length > 0;

  if (!hasAdded && !hasRemoved) {
    return 'unknown'; // no textual diff detected despite hash mismatch (e.g. structural-only change)
  }

  // Compare full-text price occurrences rather than diff fragments, since a
  // word-level diff can split a currency symbol from its adjacent digits
  // (e.g. "₹49,999" -> "₹" unchanged, "49"->"44" changed, ",999" unchanged).
  const beforePrices = extractPrices(beforeText);
  const afterPrices = extractPrices(afterText);
  const pricesDiffer =
    beforePrices.length > 0 &&
    afterPrices.length > 0 &&
    beforePrices.length === afterPrices.length &&
    beforePrices.some((p, i) => p !== afterPrices[i]);
  if (pricesDiffer) {
    return 'price_changed';
  }

  if (containsAvailabilityKeyword(added) || containsAvailabilityKeyword(removed)) {
    return 'availability_changed';
  }

  // Large-scale change relative to total content size suggests the page
  // structure shifted rather than a specific piece of text being edited.
  const totalLength = (beforeText || '').length + (afterText || '').length || 1;
  const changedLength = added.length + removed.length;
  if (changedLength / totalLength > 0.6) {
    return 'structure_changed';
  }

  if (hasAdded && hasRemoved) return 'text_modified';
  if (hasAdded) return 'text_added';
  if (hasRemoved) return 'text_removed';
  return 'unknown';
}

/**
 * Builds a concise, deterministic (non-AI) human-readable summary of a
 * change. Used as the default summary generator, and as the fallback when
 * AI summarization is disabled or fails.
 */
function generateDeterministicSummary(changeType, diffParts, watchName, beforeText = '', afterText = '') {
  const added = diffParts.filter((p) => p.type === 'added').map((p) => p.value.trim()).filter(Boolean);
  const removed = diffParts.filter((p) => p.type === 'removed').map((p) => p.value.trim()).filter(Boolean);

  const truncate = (s, n = 120) => (s.length > n ? `${s.slice(0, n)}…` : s);

  switch (changeType) {
    case 'price_changed': {
      const oldPrices = extractPrices(beforeText);
      const newPrices = extractPrices(afterText);
      const oldPrice = oldPrices[0];
      const newPrice = newPrices[0];
      if (oldPrice && newPrice) {
        return `Price changed from ${oldPrice} to ${newPrice} on "${watchName}".`;
      }
      return `The price appears to have changed on "${watchName}".`;
    }
    case 'availability_changed':
      return `Availability status changed on "${watchName}".`;
    case 'text_added':
      return `New content was added to "${watchName}": ${truncate(added.join(' '))}`;
    case 'text_removed':
      return `Content was removed from "${watchName}": ${truncate(removed.join(' '))}`;
    case 'text_modified':
      return `Content changed on "${watchName}".`;
    case 'structure_changed':
      return `The page structure or layout of "${watchName}" changed significantly.`;
    default:
      return `A change was detected on "${watchName}".`;
  }
}

module.exports = { classifyChange, generateDeterministicSummary };
