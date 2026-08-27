const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');
const { generateDeterministicSummary } = require('../detectors/changeClassifier');

/**
 * Attempts an AI-generated natural-language summary of a change when
 * AI_PROVIDER is configured. Always falls back to the deterministic
 * summary if AI is disabled, misconfigured, or the call fails - the worker
 * must never block or fail a check because a third-party AI call failed.
 *
 * Only the diff (not full page content) is sent to the provider, to limit
 * exposure of page content the user hasn't explicitly consented to share.
 */
async function generateSummary({ changeType, diffParts, watchName, beforeExcerpt, afterExcerpt }) {
  const fallback = generateDeterministicSummary(changeType, diffParts, watchName, beforeExcerpt, afterExcerpt);

  if (env.AI_PROVIDER === 'none' || !env.AI_API_KEY) {
    return fallback;
  }

  try {
    if (env.AI_PROVIDER === 'anthropic') {
      const prompt = [
        `A monitored web page section named "${watchName}" changed.`,
        `Classification: ${changeType}.`,
        `Before: ${beforeExcerpt || '(empty)'}`,
        `After: ${afterExcerpt || '(empty)'}`,
        'Write ONE concise sentence describing only what changed. Do not invent details not present above.',
      ].join('\n');

      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': env.AI_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const textBlock = (res.data.content || []).find((b) => b.type === 'text');
      const summary = textBlock?.text?.trim();
      return summary && summary.length > 0 ? summary : fallback;
    }

    // Unrecognized/unimplemented provider - use the deterministic summary.
    return fallback;
  } catch (err) {
    logger.warn({ err: err.message }, 'AI summary generation failed, using deterministic fallback');
    return fallback;
  }
}

module.exports = { generateSummary };
