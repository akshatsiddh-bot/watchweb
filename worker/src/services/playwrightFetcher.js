const { chromium } = require('playwright');
const env = require('../config/env');
const logger = require('../config/logger');
const { assertUrlIsSafe } = require('../utils/ssrfProtection');

let browserPromise = null;
let activePages = 0;
const waitQueue = [];

async function getBrowser() {
  // Reuse a single browser process across checks instead of launching one per
  // request; new browser contexts are cheap and give us page isolation.
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    browserPromise.catch(() => {
      browserPromise = null; // allow retry on next call if launch failed
    });
  }
  return browserPromise;
}

async function acquireSlot() {
  if (activePages < env.MAX_CONCURRENT_PAGES) {
    activePages += 1;
    return;
  }
  await new Promise((resolve) => waitQueue.push(resolve));
  activePages += 1;
}

function releaseSlot() {
  activePages -= 1;
  const next = waitQueue.shift();
  if (next) next();
}

/**
 * Renders a JS-heavy page with Playwright and returns its fully-rendered HTML.
 * Enforces a concurrency limit, navigation timeout, and SSRF checks on both
 * the initial URL and the final URL after any client/server redirects.
 */
async function fetchWithPlaywright(url) {
  await assertUrlIsSafe(url);
  await acquireSlot();

  const browser = await getBrowser();
  let context;
  let page;
  try {
    context = await browser.newContext({
      userAgent: 'WatchWebBot/1.0 (+https://watchweb.example.com/bot)',
      javaScriptEnabled: true,
    });
    // Block heavy/irrelevant resource types to speed up rendering and reduce
    // the chance of hitting unrelated third-party endpoints.
    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    page = await context.newPage();
    page.setDefaultTimeout(env.MAX_PAGE_LOAD_TIME_MS);

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: env.MAX_PAGE_LOAD_TIME_MS,
    });

    const finalUrl = page.url();
    if (finalUrl !== url) {
      await assertUrlIsSafe(finalUrl); // re-validate after client-side/JS redirects
    }

    const html = await page.content();
    return {
      html,
      status: response ? response.status() : null,
      finalUrl,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    releaseSlot();
  }
}

async function shutdownBrowser() {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser) await browser.close().catch(() => {});
    browserPromise = null;
  }
}

module.exports = { fetchWithPlaywright, shutdownBrowser };
