const { extractContent, SelectorNotFoundError } = require('../src/extractors/contentExtractor');
const { normalizeContent } = require('../src/extractors/normalizer');
const { hashContent } = require('../src/detectors/hasher');
const { generateDiff } = require('../src/detectors/diffGenerator');
const { classifyChange } = require('../src/detectors/changeClassifier');
const fixtures = require('./fixtures/pages');

function pipeline(html, selector) {
  const { text } = extractContent(html, {
    monitoringMode: 'selected',
    selector,
    selectorType: 'css',
    selectorFallbacks: [],
  });
  const normalized = normalizeContent(text);
  return { text, normalized, hash: hashContent(normalized) };
}

describe('Content extraction', () => {
  test('extracts text from a selected element', () => {
    const { text } = extractContent(fixtures.unchangedBefore, {
      monitoringMode: 'selected',
      selector: '#exam-schedule',
      selectorType: 'css',
    });
    expect(text).toContain('Exam starts: 12 September 2026');
  });

  test('extracts whole page text in whole_page mode', () => {
    const { text } = extractContent(fixtures.unchangedBefore, {
      monitoringMode: 'whole_page',
    });
    expect(text).toContain('Examination Schedule');
  });

  test('throws SelectorNotFoundError when selector is missing', () => {
    expect(() =>
      extractContent(fixtures.missingSelectorHtml, {
        monitoringMode: 'selected',
        selector: '#exam-schedule',
        selectorType: 'css',
      })
    ).toThrow(SelectorNotFoundError);
  });

  test('falls back to a secondary selector if the primary is missing', () => {
    const { text, matchedSelector } = extractContent(fixtures.missingSelectorHtml, {
      monitoringMode: 'selected',
      selector: '#exam-schedule',
      selectorType: 'css',
      selectorFallbacks: ['#something-else'],
    });
    expect(matchedSelector).toBe('#something-else');
    expect(text).toContain('Unrelated content');
  });
});

describe('Change detection pipeline', () => {
  test('unchanged page produces identical hashes', () => {
    const a = pipeline(fixtures.unchangedBefore, '#exam-schedule');
    const b = pipeline(fixtures.unchangedAfter, '#exam-schedule');
    expect(a.hash).toBe(b.hash);
  });

  test('text modification changes the hash and classifies as text_modified', () => {
    const a = pipeline(fixtures.textChangedBefore, '#exam-schedule');
    const b = pipeline(fixtures.textChangedAfter, '#exam-schedule');
    expect(a.hash).not.toBe(b.hash);

    const diff = generateDiff(a.normalized, b.normalized);
    const type = classifyChange(diff, a.normalized, b.normalized);
    expect(type).toBe('text_modified');
  });

  test('added text classifies as text_added', () => {
    const a = pipeline(fixtures.textAddedBefore, '#notice');
    const b = pipeline(fixtures.textAddedAfter, '#notice');
    const diff = generateDiff(a.normalized, b.normalized);
    expect(classifyChange(diff, a.normalized, b.normalized)).toBe('text_added');
  });

  test('removed text classifies as text_removed', () => {
    const a = pipeline(fixtures.textRemovedBefore, '#notice');
    const b = pipeline(fixtures.textRemovedAfter, '#notice');
    const diff = generateDiff(a.normalized, b.normalized);
    expect(classifyChange(diff, a.normalized, b.normalized)).toBe('text_removed');
  });

  test('price change classifies as price_changed', () => {
    const a = pipeline(fixtures.priceChangedBefore, '#price-box');
    const b = pipeline(fixtures.priceChangedAfter, '#price-box');
    const diff = generateDiff(a.normalized, b.normalized);
    expect(classifyChange(diff, a.normalized, b.normalized)).toBe('price_changed');
  });

  test('dynamic timestamp changes do NOT trigger a detected change (noise filtering)', () => {
    const a = pipeline(fixtures.dynamicTimestampBefore, '#notice');
    const b = pipeline(fixtures.dynamicTimestampAfter, '#notice');
    // The "Last updated" timestamp differs between fixtures, but normalization
    // should strip it so the resulting hashes match.
    expect(a.hash).toBe(b.hash);
  });
});
