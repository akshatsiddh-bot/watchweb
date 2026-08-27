const Watch = require('../models/Watch');
const Snapshot = require('../models/Snapshot');
const Change = require('../models/Change');
const { fetchHttp } = require('../services/httpFetcher');
const { fetchWithPlaywright } = require('../services/playwrightFetcher');
const { extractContent, SelectorNotFoundError } = require('../extractors/contentExtractor');
const { normalizeContent } = require('../extractors/normalizer');
const { hashContent } = require('../detectors/hasher');
const { generateDiff } = require('../detectors/diffGenerator');
const { classifyChange } = require('../detectors/changeClassifier');
const { generateSummary } = require('../services/aiSummaryService');
const { notify } = require('../notifications/notificationService');
const { SsrfBlockedError } = require('../utils/ssrfProtection');
const env = require('../config/env');
const logger = require('../config/logger');

const MAX_FAILURES = env.MAX_FAILURES_BEFORE_ERROR_STATUS;

/**
 * Heuristic for whether a page likely needs JS rendering: the watch was
 * explicitly flagged as requiring JS at creation time, or a prior HTTP-only
 * fetch failed to locate the selector (handled by the retry-with-playwright
 * fallback below).
 */
async function fetchPage(watch) {
  if (watch.requiresJs) {
    const result = await fetchWithPlaywright(watch.url);
    return { ...result, fetchMethod: 'playwright' };
  }
  const result = await fetchHttp(watch.url);
  return { ...result, fetchMethod: 'http' };
}

function computeNextCheckAt(intervalMinutes) {
  return new Date(Date.now() + intervalMinutes * 60 * 1000);
}

/**
 * Runs a single check for one watch: fetch -> extract -> normalize -> hash
 * -> compare -> (if changed) diff + classify + summarize + notify.
 * Never throws - all failure modes are caught and recorded on the watch as
 * an error state rather than propagating (a failed check must never be
 * mistaken for a detected content change).
 */
async function runCheck(watchId) {
  const watch = await Watch.findById(watchId);
  if (!watch || watch.status === 'deleted' || watch.status === 'paused') {
    return { skipped: true };
  }

  const startedAt = Date.now();
  let fetchResult;

  try {
    fetchResult = await fetchPage(watch);
  } catch (err) {
    // If a plain HTTP fetch succeeded in reaching the page but rendering
    // may be required (e.g. selector not present in raw HTML at all), a
    // one-time automatic Playwright retry is attempted before failing.
    if (!watch.requiresJs && !(err instanceof SsrfBlockedError)) {
      try {
        fetchResult = await fetchWithPlaywright(watch.url);
        fetchResult.fetchMethod = 'playwright';
        watch.requiresJs = true; // remember for future checks
      } catch (retryErr) {
        return recordFailure(watch, retryErr, Date.now() - startedAt);
      }
    } else {
      return recordFailure(watch, err, Date.now() - startedAt);
    }
  }

  let extraction;
  try {
    extraction = extractContent(fetchResult.html, {
      monitoringMode: watch.monitoringMode,
      selector: watch.selector,
      selectorType: watch.selectorType,
      selectorFallbacks: watch.selectorFallbacks,
    });
  } catch (err) {
    if (err instanceof SelectorNotFoundError && !watch.requiresJs) {
      // Selector might only exist after JS execution - retry once with
      // Playwright before concluding it's genuinely missing.
      try {
        const rendered = await fetchWithPlaywright(watch.url);
        extraction = extractContent(rendered.html, {
          monitoringMode: watch.monitoringMode,
          selector: watch.selector,
          selectorType: watch.selectorType,
          selectorFallbacks: watch.selectorFallbacks,
        });
        fetchResult = { ...rendered, fetchMethod: 'playwright' };
        watch.requiresJs = true;
      } catch (retryErr) {
        return recordFailure(
          watch,
          retryErr instanceof SelectorNotFoundError ? retryErr : err,
          Date.now() - startedAt
        );
      }
    } else {
      return recordFailure(watch, err, Date.now() - startedAt);
    }
  }

  const normalized = normalizeContent(extraction.text);
  const contentHash = hashContent(normalized);

  const previousSnapshot = watch.latestSnapshotId
    ? await Snapshot.findById(watch.latestSnapshotId)
    : null;

  const snapshot = await Snapshot.create({
    watchId: watch._id,
    content: extraction.text.slice(0, env.MAX_CONTENT_CHARS),
    normalizedContent: normalized,
    contentHash,
    metadata: {
      fetchMethod: fetchResult.fetchMethod,
      httpStatus: fetchResult.status,
      contentLength: extraction.text.length,
      truncated: extraction.text.length > env.MAX_CONTENT_CHARS,
    },
  });

  watch.latestSnapshotId = snapshot._id;
  watch.lastCheckedAt = new Date();
  watch.status = 'active';
  watch.failureCount = 0;
  watch.lastError = null;
  watch.nextCheckAt = computeNextCheckAt(watch.interval);

  const isFirstSnapshot = !previousSnapshot;
  const hasChanged = !isFirstSnapshot && previousSnapshot.contentHash !== contentHash;

  if (!hasChanged) {
    await watch.save();
    logger.info(
      { watchId: watch._id.toString(), durationMs: Date.now() - startedAt, changed: false },
      'Check completed'
    );
    return { changed: false, initial: isFirstSnapshot };
  }

  const diffParts = generateDiff(previousSnapshot.normalizedContent, normalized);
  const changeType = classifyChange(diffParts, previousSnapshot.normalizedContent, normalized);
  const summary = await generateSummary({
    changeType,
    diffParts,
    watchName: watch.name,
    beforeExcerpt: previousSnapshot.normalizedContent.slice(0, 500),
    afterExcerpt: normalized.slice(0, 500),
  });

  let change = new Change({
    watchId: watch._id,
    userId: watch.userId,
    previousSnapshotId: previousSnapshot._id,
    currentSnapshotId: snapshot._id,
    changeType,
    diff: diffParts,
    summary,
    beforeExcerpt: previousSnapshot.normalizedContent.slice(0, 2000),
    afterExcerpt: normalized.slice(0, 2000),
  });

  change = await notify(change, watch);
  await change.save();

  watch.lastChangedAt = new Date();
  await watch.save();

  logger.info(
    { watchId: watch._id.toString(), changeType, durationMs: Date.now() - startedAt, changed: true },
    'Check completed - change detected'
  );

  return { changed: true, changeId: change._id.toString(), changeType };
}

async function recordFailure(watch, err, durationMs) {
  watch.failureCount += 1;
  watch.lastError = describeError(err);
  watch.lastCheckedAt = new Date();
  watch.nextCheckAt = computeNextCheckAt(watch.interval);

  if (watch.failureCount >= MAX_FAILURES) {
    watch.status = 'error';
  }

  await watch.save();
  logger.warn(
    { watchId: watch._id.toString(), error: watch.lastError, durationMs, failureCount: watch.failureCount },
    'Check failed'
  );
  return { changed: false, error: watch.lastError };
}

function describeError(err) {
  if (err instanceof SelectorNotFoundError) {
    return 'The monitored section could not be found.';
  }
  if (err instanceof SsrfBlockedError) {
    return 'This URL is not allowed to be monitored.';
  }
  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
    return 'The website could not be reached (DNS failure).';
  }
  if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
    return 'The website took too long to respond (timeout).';
  }
  if (err.response && err.response.status) {
    return `The website returned an error (HTTP ${err.response.status}).`;
  }
  return 'An unexpected error occurred while checking this page.';
}

module.exports = { runCheck };
