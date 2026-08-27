# WatchWeb

**Monitor any meaningful part of a website and get notified when it changes.**

WatchWeb is a Chrome Extension and web dashboard for monitoring specific sections of web pages—or entire pages—and detecting **meaningful content changes**, not just raw HTML differences.

It filters common sources of noise such as timestamps, view counters, and random IDs, then shows exactly what changed with a structured before/after diff and change classification such as `price_changed`, `availability_changed`, `text_added`, or `text_removed`.

## Product Overview

1. Install the WatchWeb Chrome extension and log in or register.
2. Visit the webpage you want to monitor, such as an exam schedule, product page, notice board, job listing, or documentation page.
3. Open the WatchWeb extension and select **Select content on this page**.
4. Hover over and select the section you want to monitor. Press `Escape` to cancel.
5. Give the watch a name, choose a check interval and notification preference, and create the watch.
6. The server-side monitoring worker periodically checks the target page. If the extracted and normalized content has meaningfully changed, WatchWeb records a `Change` with a structured diff and classification.
7. The extension delivers browser notifications for detected changes.
8. Open the dashboard to view change history, before/after differences, and manage watches.

## Architecture

```text
                         ┌──────────────────────────────┐
                         │        Chrome Extension      │
                         │                              │
                         │  Popup                       │
                         │  Content Script              │
                         │  Background Service Worker   │
                         └──────────────┬───────────────┘
                                        │
                              HTTPS REST API
                               Bearer JWT
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │      Node.js + Express        │
                         │          Backend              │
                         │                              │
                         │  Authentication              │
                         │  Watch Management             │
                         │  Change History               │
                         │  User Settings                │
                         │  Notifications                │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │     MongoDB      │
                              │                  │
                              │ Users            │
                              │ Watches          │
                              │ Snapshots        │
                              │ Changes          │
                              └────────┬─────────┘
                                       ▲
                                       │
                              Same MongoDB
                              Separate Process
                                       │
                                       │
                         ┌─────────────┴────────────┐
                         │    Monitoring Worker      │
                         │                          │
                         │ Scheduler                │
                         │ HTTP Fetcher             │
                         │ Playwright Fetcher       │
                         │ Content Extraction       │
                         │ Normalization             │
                         │ Hashing & Diffing         │
                         │ Change Classification     │
                         │ AI Summarization         │
                         │ Notification Service     │
                         └──────────────────────────┘

                         ┌──────────────────────────┐
                         │      Web Dashboard       │
                         │                          │
                         │ React + Vite + Tailwind  │
                         └─────────────┬────────────┘
                                       │
                                HTTPS REST API
                                       │
                                       ▼
                                  Backend API
```

The extension's background service worker polls `GET /api/notifications/pending` every two minutes and converts pending changes into native `chrome.notifications`.

This is **notification delivery only**. Target websites are monitored exclusively by the server-side worker.

## Tech Stack

### Chrome Extension

- Manifest V3
- React
- Vanilla JavaScript for background and content scripts
- Vite
- Tailwind CSS
- Chrome Storage API
- Chrome Scripting API
- Chrome Notifications API
- Chrome Alarms API

### Web Dashboard

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Argon2id
- Helmet
- CORS
- Express Rate Limit
- Express Validator
- Pino

### Monitoring Worker

- Node.js
- Axios
- Playwright
- Cheerio
- `diff`
- MongoDB/Mongoose
- Pino
- BullMQ/IORedis dependencies for future queue-based scaling

## Repository Structure

```text
watchweb/
├── backend/       # REST API, authentication, watch management, SSRF protection
├── worker/        # Monitoring engine: fetch → extract → normalize → diff → notify
├── dashboard/     # React web dashboard
├── extension/     # Chrome MV3 extension
├── package.json   # Root workspace configuration
├── package-lock.json
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Chrome or Chromium
- Internet access for Playwright browser installation

MongoDB can run locally, through Docker, or through MongoDB Atlas.

Install all project dependencies from the repository root:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

### Environment Configuration

Create the environment files from their examples:

```text
backend/.env
worker/.env
dashboard/.env
```

Copy the corresponding `.env.example` into each location.

For local development, the backend and worker should use the same MongoDB database.

Example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/watchweb
```

Set a strong random value for:

```env
JWT_SECRET=your-long-random-secret
```

For the dashboard:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

The extension ID must also be configured in `backend/.env` after loading the unpacked extension into Chrome:

```env
EXTENSION_ID=your-chrome-extension-id
```

See the `.env.example` files in each package for the complete configuration.

## MongoDB

WatchWeb requires MongoDB for users, watches, snapshots, changes, and notification state.

For local development:

```text
mongodb://127.0.0.1:27017/watchweb
```

The backend and worker must point to the **same database**.

No Redis installation is required for the current MVP scheduler.

## Redis / BullMQ

The current scheduler uses MongoDB polling and does not require Redis.

The project includes BullMQ and IORedis dependencies so the scheduler can later be migrated to a proper distributed queue.

Current architecture:

```text
MongoDB
   │
   ▼
MongoDB polling scheduler
   │
   ▼
runCheck()
```

Future scalable architecture:

```text
MongoDB
   │
   ▼
BullMQ / Redis
   │
   ├── Worker 1
   ├── Worker 2
   └── Worker 3
```

The detection pipeline is separated from scheduling so the queue implementation can be replaced without rewriting the core monitoring logic.

## Running the System

Run each service in its own terminal.

### Backend

```bash
npm run dev:backend
```

Runs on:

```text
http://localhost:4000
```

### Worker

```bash
npm run dev:worker
```

The worker polls MongoDB for due watches. The default scheduler polling interval is 15 seconds.

### Dashboard

```bash
npm run dev:dashboard
```

Runs on:

```text
http://localhost:5173
```

### Extension

```bash
npm run dev:extension
```

This builds the extension into:

```text
extension/dist
```

## Loading the Chrome Extension

1. Run the extension build/watch command.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select:

```text
extension/dist
```

6. Copy the generated extension ID.
7. Add that ID to `backend/.env` as `EXTENSION_ID`.
8. Restart the backend.
9. Reload the WatchWeb extension in Chrome.

Then open the WatchWeb extension and log in.

## Typical Workflow

```text
User visits webpage
        │
        ▼
Chrome Extension
        │
        ▼
Select monitored element
        │
        ▼
Generate and verify selectors
        │
        ▼
Create Watch through API
        │
        ▼
MongoDB
        │
        ▼
Monitoring Worker
        │
        ├── HTTP fetch
        │
        └── Playwright fallback
        │
        ▼
Extract content
        │
        ▼
Normalize noise
        │
        ▼
SHA-256 comparison
        │
        ▼
Word-level diff
        │
        ▼
Classify change
        │
        ├── Price
        ├── Availability
        ├── Text added
        ├── Text removed
        ├── Text modified
        └── Structural change
        │
        ▼
Store Change
        │
        ▼
Notification pending
        │
        ▼
Chrome Extension
        │
        ▼
Browser notification
```

## Monitoring Engine

### Fetch Strategy

WatchWeb first attempts an HTTP request using Axios.

If the request fails or the monitored selector cannot be found in the returned HTML, the worker can retry using Playwright.

```text
Watch
 │
 ▼
HTTP Fetch
 │
 ├── Success + selector found ──► Extract
 │
 └── Failed / selector missing
                  │
                  ▼
              Playwright
                  │
                  ▼
                Extract
```

Once JavaScript rendering is determined to be required, the watch stores this information in `watch.requiresJs` so future checks can use the appropriate fetch strategy.

Playwright uses a shared browser process, separate contexts per check, configurable concurrency, navigation timeouts, and resource blocking for unnecessary resources such as images, media, and fonts.

### Content Extraction

The worker attempts selectors in this order:

1. Primary CSS selector
2. Stored fallback selectors
3. Selector failure

The worker **does not silently fall back to whole-page monitoring** when the selected element disappears.

Instead, it records the selector failure so the watch can be repaired.

### Normalization

WatchWeb removes common dynamic noise such as:

- ISO timestamps
- Relative timestamps such as `5 minutes ago`
- `Last updated:` lines
- View and visitor counters
- Long UUID/hex-like identifiers

Normalization is intentionally conservative.

Plain numbers are not automatically removed because they may represent meaningful values such as:

- Prices
- Dates
- Counts
- Quantities
- Deadlines

### Change Detection

Content is normalized and hashed using SHA-256.

When hashes differ, WatchWeb generates a word-level diff.

Changes can be classified as:

```text
price_changed
availability_changed
text_added
text_removed
text_modified
structure_changed
```

Price detection is currency-symbol aware.

Large-scale changes affecting more than 60% of the monitored content can be classified as structural changes.

### Failure Handling

A failed fetch or missing selector is **never treated as a content change**.

Failures include:

- DNS failures
- Connection failures
- HTTP failures
- Timeouts
- Playwright failures
- Selector-not-found errors

After the configured number of consecutive failures, the watch is marked as being in an error state and `lastError` is recorded.

No `Change` record is created for a failed check.

### Snapshot Retention

A daily cleanup job removes snapshots older than `SNAPSHOT_RETENTION_DAYS`.

The current snapshot for every watch is always preserved.

## Security

Security is a core part of WatchWeb because users can submit arbitrary URLs for server-side fetching.

### Password Security

Passwords are hashed using Argon2id.

Plaintext passwords are never stored or logged.

### Authentication

WatchWeb uses stateless JWT authentication.

A `tokenVersion` value allows previously issued tokens to be invalidated when required, including:

- Password changes
- Logout from all devices
- Account security events

### Authorization

Protected resources are scoped to the authenticated user's ID.

The user ID is derived from the verified JWT rather than client-supplied input.

Cross-user resource access returns `404` rather than `403` to avoid revealing whether another user's resource exists.

### SSRF Protection

WatchWeb implements SSRF protection in both the backend and worker.

Blocked targets include:

- Loopback addresses
- Private network ranges
- CGNAT ranges
- Link-local addresses
- Cloud metadata addresses such as `169.254.169.254`
- Unsupported URL schemes

SSRF validation occurs:

1. When creating a watch
2. Before fetching a target
3. After every redirect

Redirect validation is important because an otherwise safe public URL can redirect to a private or metadata address.

Only HTTP and HTTPS URLs are supported.

### Rate Limiting

The backend applies:

- Global API rate limiting
- Stricter rate limiting for authentication endpoints

### Resource Limits

WatchWeb limits resource consumption through:

- Maximum watches per user
- Minimum check interval
- Maximum response size
- Maximum page-load time
- Maximum concurrent Playwright pages
- Maximum stored content size

### Chrome Extension Permissions

The extension uses minimal permissions:

```text
storage
activeTab
scripting
notifications
alarms
```

It does not request:

```text
tabs
history
cookies
webRequest
```

There is also no persistent content script running on every website.

The content script is injected only when the user explicitly starts content selection.

### Token Handling

The JWT is owned by the extension's background service worker.

The popup and content script communicate with the background worker through Chrome runtime messages and do not directly access the JWT.

## API

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/logout-all
GET  /api/auth/me
```

### Watches

```text
GET    /api/watches
POST   /api/watches
GET    /api/watches/:id
PATCH  /api/watches/:id
DELETE /api/watches/:id

POST /api/watches/:id/pause
POST /api/watches/:id/resume
POST /api/watches/:id/check
```

### Changes

```text
GET /api/watches/:id/changes
GET /api/changes/:id
```

### Dashboard

```text
GET /api/dashboard/stats
```

### Notifications

```text
GET  /api/notifications/pending
POST /api/notifications/:id/ack
```

### User Settings

```text
PATCH /api/users/me
POST  /api/users/me/change-password
POST  /api/users/me/delete-account
```

All routes require authentication except:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/health
```

## Testing

Run backend tests:

```bash
npm run test:backend
```

Run worker tests:

```bash
npm run test:worker
```

Run the complete test suite:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

### What Is Tested

Backend tests cover areas such as:

- Authentication
- Password hashing
- JWT authentication
- Watch ownership
- Authorization
- SSRF protection

Worker tests cover:

- Content extraction
- Selector fallback
- Noise normalization
- SHA-256 hashing
- Word-level diffing
- Price detection
- Availability detection
- Text additions/removals/modifications
- Structural changes
- Dynamic timestamp filtering
- Fetcher SSRF protection

## Monitoring Limitations

WatchWeb cannot reliably monitor every website.

Monitoring may fail for pages that:

- Require authentication or private browser sessions
- Block automated requests
- Require CAPTCHA or anti-bot challenges
- Depend on browser interactions the worker cannot reproduce
- Render content in unsupported ways
- Continuously mutate content in ways that cannot reliably be distinguished from meaningful changes
- Remove or significantly change the monitored element

A page that is visible to the user in Chrome is **not automatically guaranteed to be accessible to the server-side worker**.

When a check fails or a selector disappears, WatchWeb records the failure rather than creating a false change event.

## Known Limitations

### Scheduler

The MVP scheduler polls MongoDB directly instead of using BullMQ/Redis.

It is suitable for a single worker process and uses optimistic claiming to prevent duplicate processing.

A distributed queue should be introduced when horizontal worker scaling becomes necessary.

### XPath

XPath support is currently minimal.

CSS selectors are the primary supported selector mechanism.

### AI Summaries

AI-generated summaries are optional.

The current implementation supports Anthropic through:

```env
AI_PROVIDER=anthropic
```

When AI is disabled or unavailable, WatchWeb uses a deterministic summary generator.

AI is an enhancement layer and is not responsible for deciding whether a page changed.

### Notifications

The current notification channel is browser notifications through the Chrome extension.

The notification service is structured so additional channels such as email, Telegram, or Discord can be added later.

### End-to-End Browser/Database Testing

The original development environment did not provide the required live MongoDB and Playwright browser environment, so some end-to-end scenarios could not initially be exercised there.

Local verification should include the complete flow:

```text
Watch creation
      ↓
Worker check
      ↓
Snapshot
      ↓
Website change
      ↓
Change detection
      ↓
Notification
      ↓
Dashboard history
```

## Recommended Future Improvements

1. Replace MongoDB polling with BullMQ/Redis when multiple workers are required.
2. Add email, Telegram, and Discord notification channels.
3. Expand XPath support if real-world usage demonstrates a need for it.
4. Add Playwright-based E2E tests covering extension → backend → worker → dashboard.
5. Add selector re-validation and repair suggestions when monitored elements disappear.
6. Add watch-health diagnostics showing successful checks, failures, selector status, and last successful fetch.
7. Add explicit support for different monitoring states such as active, paused, and error.
