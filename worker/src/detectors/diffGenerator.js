const { diffWords } = require('diff');

/**
 * Produces a structured, word-level diff between two text blocks, suitable
 * for rendering additions/deletions in the dashboard UI. Each part is
 * { type: 'equal' | 'added' | 'removed', value }.
 */
function generateDiff(beforeText, afterText) {
  const parts = diffWords(beforeText || '', afterText || '');
  return parts.map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'equal',
    value: part.value,
  }));
}

module.exports = { generateDiff };
