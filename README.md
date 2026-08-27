# WatchWeb

Watch anything on a website and get notified when the meaningful content changes.

WatchWeb is a Chrome Extension + web dashboard for monitoring specific sections of
web pages (or whole pages) and detecting **meaningful** content changes — not
just "the HTML changed." It ignores obvious noise (timestamps, view counters,
random IDs) and shows exactly what changed: before, after, and a classified
diff (e.g. `price_changed`, `text_added`, `availability_changed`).

## Product overview

1. Install the Chrome extension and log in (or register).
2. Visit any page you want to monitor (exam schedule, product page, notice
   board, job listing, etc.).
3. Click the WatchWeb icon → **Select content on this page**.
4. Hover/click the section you care about (or press Escape to cancel).
5. Name the watch, pick a check interval and notification preference, and
   create it.
6. The server-side worker periodically re-checks the page. If the extracted,
   normalized content actually changes, it's recorded as a `Change` with a
   structured diff and a classification, and you get a browser notification.
7. Open the dashboard to see change history, before/after diffs, and manage
   watches (pause/resume/delete).

## Architecture

```
Chrome Extension (popup + content script + background service worker)
        |  HTTPS REST API (Bearer JWT)
        v
Node.js + Express Backend  <---->  MongoDB (Users, Watches, Snapshots, Changes)
        ^
        |  same MongoDB, different process
        |
Monitoring Worker (polls MongoDB for due watches)
        |
        +-- HTTP fetch (axios) for static pages
        +-- Playwright (headless Chromium) for JS-rendered pages
        +-- Content extraction (cheerio + robust selector fallbacks)
        +-- Normalization (noise stripping: timestamps, counters, IDs)
        +-- SHA-256 hashing + word-level diff (diff package)
        +-- Change classification (price/availability/text add-remove-modify/structure)
        +-- Optional AI summary (pluggable; deterministic fallback always available)
        +-- Notification service (marks Change.notificationStatus)

Web Dashboard (React + Vite + Tailwind)
        |  HTTPS REST API (same backend, same JWT)
        v
Node.js + Express Backend
```

The extension's background service worker also polls
`GET /api/notifications/pending` every 2 minutes and turns pending Changes
into `chrome.notifications` — this is notification *delivery*, not website
monitoring; all target-website polling happens exclusively in the worker
process, server-side.

## Tech stack

- **Extension:** Manifest V3, React (popup only), vanilla JS (background +
  content script), Vite, Tailwind.
- **Dashboard:** React 18, Vite, Tailwind, React Router, axios, lucide-react.
- **Backend:** Node.js, Express, MongoDB/Mongoose, JWT, Argon2id, Helmet,
  CORS, express-rate-limit, express-validator, Pino.
- **Worker:** Node.js, axios, Playwright (Chromium), cheerio, the `diff`
  package, Pino.

## Repository structure

```
watchweb/
├── backend/    # REST API, auth, watch CRUD, SSRF protection
├── worker/     # monitoring engine: fetch → extract → normalize → diff → notify
├── dashboard/  # React web app
├── extension/  # Chrome MV3 extension (popup, content script, background)
└── package.json (root workspace scripts)
```

## Installation

Prerequisites: Node.js 18+, MongoDB running locally (or Atlas), and — for the
worker — enough disk/network access for Playwright to download a Chromium
build the first time you install its dependencies.

```bash
npm install                     # installs backend, worker, dashboard, extension
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env
cp dashboard/.env.example dashboard/.env
```

Edit `backend/.env` and `worker/.env` to point `MONGODB_URI` at your MongoDB
instance and set a real `JWT_SECRET`.

### MongoDB setup

Any MongoDB 6+ instance works — local (`mongod`), Docker, or MongoDB Atlas.
Set `MONGODB_URI` accordingly in both `backend/.env` and `worker/.env` (they
must point at the **same** database).

### Redis / BullMQ (optional, for horizontal scaling)

The MVP scheduler (`worker/src/jobs/scheduler.js`) polls MongoDB directly for
due watches and requires no Redis. The codebase includes `bullmq`/`ioredis`
as dependencies and is structured so `pollAndDispatch()` can be swapped for a
BullMQ consumer without touching `runCheck()` or anything downstream, once
you need multiple independent worker processes coordinating via a shared
queue instead of MongoDB polling + optimistic claiming.

## Running the system

```bash
npm run dev:backend      # http://localhost:4000
npm run dev:worker       # polls MongoDB every 15s (configurable) and checks due watches
npm run dev:dashboard    # http://localhost:5173
npm run dev:extension    # vite build --watch, outputs to extension/dist
```

### Loading the unpacked extension in Chrome

1. Run `npm run dev:extension` (or `cd extension && npm run build` once).
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select `extension/dist`.
4. Click the WatchWeb icon, register or log in, visit any page, and click
   **Select content on this page**.

## Environment variables

### backend/.env

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign/verify JWTs — must be long and random |
| `CLIENT_URL` | Dashboard origin, allowed by CORS |
| `EXTENSION_ID` | Chrome extension ID, allowed by CORS (`chrome-extension://<id>`) |
| `MAX_WATCHES_PER_USER`, `MIN_CHECK_INTERVAL` | Abuse/resource limits |
| `AI_PROVIDER`, `AI_API_KEY` | Optional AI change-summary provider |

### worker/.env

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Same database as the backend |
| `WORKER_POLL_INTERVAL_MS`, `WORKER_BATCH_SIZE` | Scheduler tuning |
| `MAX_CONCURRENT_PAGES`, `MAX_PAGE_LOAD_TIME` | Playwright resource limits |
| `WORKER_MAX_CONTENT_CHARS` | Caps stored content size per snapshot |
| `SNAPSHOT_RETENTION_DAYS` | How long old snapshots are kept (latest is always kept) |

See `.env.example` in each package for the full list with defaults.

## Security

- **Passwords:** Argon2id, never stored or logged in plaintext.
- **Auth:** stateless JWTs with a `tokenVersion` field so password changes /
  "log out everywhere" actually invalidate existing tokens.
- **Authorization:** every watch/snapshot/change lookup is scoped to
  `req.userId` (derived only from the verified JWT, never from client input);
  cross-user access returns 404, not 403, to avoid leaking existence.
- **SSRF protection** (`backend/src/utils/ssrfProtection.js`, mirrored in the
  worker): blocks loopback, private/CGNAT/link-local ranges, cloud metadata
  addresses (`169.254.169.254`), and non-http(s) schemes — enforced both at
  watch-creation time and again at fetch time, including **per-redirect-hop**
  re-validation, since a redirect can otherwise bypass the initial check.
- **Rate limiting:** global API limiter plus a stricter one on `/api/auth/*`.
- **Resource limits:** max response size, max page load time, max concurrent
  Playwright pages/contexts, minimum monitoring interval, max watches/user.
- **Minimal extension permissions:** `storage`, `activeTab`, `scripting`,
  `notifications` only — no `tabs`, `history`, `cookies`, or `webRequest`,
  and no persistent `content_scripts` matching every page; the content
  script is injected on-demand via `chrome.scripting.executeScript` only
  when the user clicks "Select content."
- **Token handling:** the JWT is read/written only in the background service
  worker (never exposed to the content script or the web page it runs in);
  the popup and content script only ever send/receive plain data over
  `chrome.runtime.sendMessage`.

## Monitoring architecture details

- **Fetch strategy:** HTTP (axios) first; automatically retries with
  Playwright if the initial fetch fails or the selector can't be located in
  the raw HTML (heuristic for JS-rendered content), and remembers that
  decision (`watch.requiresJs`) for future checks. Playwright reuses a single
  browser process across checks (new contexts per check) and enforces a
  concurrency limit, navigation timeout, and resource-type blocking
  (images/media/fonts) for speed.
- **Extraction:** primary CSS selector, then any stored fallback selectors,
  then reports "the monitored section could not be found" rather than
  silently falling back to whole-page monitoring.
- **Normalization:** strips ISO timestamps, "N minutes/hours ago" phrases,
  "Last updated:" lines, view/visitor counters, and long hex/UUID-like
  tokens — deliberately conservative, so it never strips plain numbers
  (prices, dates, counts) that could be a real change.
- **Change classification:** price (currency-symbol-aware), availability
  keywords, large-scale structural change (>60% of content touched), else
  text added/removed/modified.
- **Failures never look like changes:** fetch/DNS/timeout/selector-missing
  errors set `watch.status = 'error'` after `MAX_FAILURES` consecutive
  failures and record `lastError`, without creating a `Change` record.
- **Retention:** a daily job deletes snapshots older than
  `SNAPSHOT_RETENTION_DAYS`, always preserving each watch's current snapshot.

## API overview

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/logout-all
GET    /api/auth/me

GET    /api/watches
POST   /api/watches
GET    /api/watches/:id
PATCH  /api/watches/:id
DELETE /api/watches/:id
POST   /api/watches/:id/pause
POST   /api/watches/:id/resume
POST   /api/watches/:id/check
GET    /api/watches/:id/changes
GET    /api/changes/:id
GET    /api/dashboard/stats

GET    /api/notifications/pending   (polled by the extension)
POST   /api/notifications/:id/ack

PATCH  /api/users/me
POST   /api/users/me/change-password
POST   /api/users/me/delete-account
```

All routes except `/auth/register`, `/auth/login`, and `/health` require
`Authorization: Bearer <token>`.

## Testing

```bash
npm run test:backend   # auth, watch ownership/authorization, SSRF blocking
npm run test:worker    # extraction, normalization, hashing, diff, classification, noise filtering
```

Backend tests use `mongodb-memory-server`; worker tests exercise the
detection pipeline directly against HTML fixtures (no live network needed)
plus a real local HTTP server for the SSRF-in-fetcher test.

## Known limitations

- **The MVP scheduler polls MongoDB directly** rather than using BullMQ/Redis
  for job distribution. It's safe for a single worker process (uses an
  optimistic `nextCheckAt` claim to avoid double-processing) but is not yet a
  true multi-worker job queue — see the BullMQ note above for the intended
  scale-up path.
- **XPath selector support is minimal** (only simple `@id=...` expressions
  are resolved); CSS selectors are the primary, fully-supported mechanism,
  which covers the vast majority of real-world targets.
- **AI summaries** are implemented for Anthropic's API behind
  `AI_PROVIDER=anthropic` with a deterministic fallback; no other providers
  are wired up yet (the abstraction supports adding them).
- **Notification channels:** browser notifications only; the
  `notificationService` module is intentionally structured so email/Telegram/
  Discord can be added as new branches without touching calling code.
- **In this build/verification environment**, MongoDB and Playwright's
  browser binary could not be installed (no network access beyond package
  registries), so integration tests requiring a live database or an actual
  headless browser were not run end-to-end here. What *was* verified
  directly: all worker detection-pipeline unit tests (extraction,
  normalization, hashing, diffing, classification, noise filtering) against
  real HTML fixtures; SSRF protection against a real local HTTP server and a
  battery of blocked targets; password hashing/verification; JWT-protected
  route behavior; and both the dashboard and extension production builds
  compiling cleanly. Run `npm run dev:backend`/`dev:worker` against a real
  MongoDB instance to complete end-to-end verification (watch creation →
  worker check → change detection → notification → dashboard display).

## Recommended next improvements

1. Swap the MongoDB-polling scheduler for a BullMQ consumer for true
   horizontal worker scaling.
2. Add email/Telegram notification channels alongside browser notifications.
3. Expand XPath support (e.g. via the `xpath` + `xmldom` packages) if
   selector robustness on XPath-heavy sites becomes a priority.
4. Add Playwright-based E2E tests for the full extension → backend → worker →
   dashboard flow once a CI environment with browser/database access is
   available.
5. Add per-watch selector re-validation/repair suggestions when a selector
   stops matching (currently it just reports the section as not found).
