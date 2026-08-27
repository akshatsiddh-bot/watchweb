const cheerio = require('cheerio');

class SelectorNotFoundError extends Error {}

/**
 * Removes elements that are almost never part of "meaningful" page content:
 * scripts, styles, ads, tracking pixels, and common cookie/consent banners.
 */
function stripNoiseElements($, root) {
  root
    .find(
      [
        'script',
        'style',
        'noscript',
        'iframe',
        'svg',
        '[aria-hidden="true"]',
        '.advertisement',
        '.ad',
        '.ads',
        '[class*="cookie-banner" i]',
        '[class*="consent" i]',
        '[id*="google_ads" i]',
      ].join(', ')
    )
    .remove();
  return root;
}

/**
 * Given HTML and a watch's selector configuration, extracts the text content
 * of the target element(s), or of <body> for whole-page monitoring.
 * Tries the primary selector first, then any stored fallbacks, so that minor
 * DOM/class-name changes on the target site don't immediately break the watch.
 */
function extractContent(html, { monitoringMode, selector, selectorType, selectorFallbacks = [] }) {
  const $ = cheerio.load(html);

  if (monitoringMode === 'whole_page') {
    const body = stripNoiseElements($, $('body'));
    return { text: normalizeWhitespace(body.text()), matchedSelector: null };
  }

  const candidates = [selector, ...selectorFallbacks].filter(Boolean);

  for (const candidate of candidates) {
    let found;
    try {
      found = selectorType === 'xpath' ? findByXPath($, candidate) : $(candidate);
    } catch {
      continue; // invalid selector syntax, try next candidate
    }
    if (found && found.length > 0) {
      const cleaned = stripNoiseElements($, found);
      const text = normalizeWhitespace(cleaned.text());
      if (text.length > 0) {
        return { text, matchedSelector: candidate };
      }
    }
  }

  throw new SelectorNotFoundError('The monitored section could not be found.');
}

// Cheerio doesn't support XPath natively; for the common case of simple
// XPath-like paths we fall back to a best-effort attribute-based lookup.
// Full XPath support would require an additional dependency (e.g. xpath +
// xmldom); given selectors are primarily CSS in this product, XPath is kept
// as a documented fallback path rather than a primary mechanism.
function findByXPath($, xpath) {
  const idMatch = xpath.match(/@id=['"]([^'"]+)['"]/);
  if (idMatch) {
    return $(`#${idMatch[1]}`);
  }
  throw new Error('Unsupported XPath expression');
}

function normalizeWhitespace(text) {
  return text.replace(/[ \t\f\v]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

module.exports = { extractContent, SelectorNotFoundError, normalizeWhitespace };
