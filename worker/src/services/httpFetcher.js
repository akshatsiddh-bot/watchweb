const axios = require('axios');
const env = require('../config/env');
const { assertUrlIsSafe, SsrfBlockedError } = require('../utils/ssrfProtection');
const logger = require('../config/logger');

const MAX_REDIRECTS = 5;

/**
 * Fetches a URL over plain HTTP(S), manually following redirects one hop at a
 * time so every intermediate target is re-validated against SSRF rules
 * (a redirect can otherwise be used to bypass the initial URL check).
 */
async function fetchHttp(url) {
  let currentUrl = url;
  let response;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertUrlIsSafe(currentUrl);

    response = await axios.get(currentUrl, {
      timeout: env.HTTP_TIMEOUT_MS,
      maxRedirects: 0, // we handle redirects ourselves to re-check each hop
      maxContentLength: env.MAX_RESPONSE_SIZE_BYTES,
      maxBodyLength: env.MAX_RESPONSE_SIZE_BYTES,
      validateStatus: (status) => status < 400 || (status >= 300 && status < 400),
      headers: {
        'User-Agent': 'WatchWebBot/1.0 (+https://watchweb.example.com/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      currentUrl = new URL(response.headers.location, currentUrl).toString();
      continue;
    }

    return {
      html: response.data,
      status: response.status,
      finalUrl: currentUrl,
    };
  }

  throw new Error('Too many redirects');
}

module.exports = { fetchHttp, SsrfBlockedError };
