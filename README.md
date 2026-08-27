# WatchWeb

**Monitor meaningful changes on websites and get notified when something changes.**

WatchWeb is a Chrome Extension + web dashboard that lets you monitor a specific section of a webpage—or an entire page—and detect **meaningful content changes** rather than noisy raw HTML differences.

It is designed for use cases such as:

- Product prices and availability
- Job listings
- Exam schedules
- Government and college notices
- News and announcement pages
- Documentation
- Event information
- GitHub pages
- Other public webpages

WatchWeb extracts the monitored content, normalizes common dynamic noise, detects changes, generates a structured before/after diff, classifies the change, and delivers a browser notification.

---

## 🔗 Quick Links

| Resource              | Link                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Chrome Extension**  | [Download from GitHub Releases](https://github.com/akshatsiddh-bot/watchweb/releases/download/v1.0.1/watchweb-extension-v1.0.1.zip) |
| **Live Dashboard**    | [watchweb-dashboard.vercel.app](https://watchweb-dashboard.vercel.app)                                                              |
| **GitHub Repository** | [github.com/akshatsiddh-bot/watchweb](https://github.com/akshatsiddh-bot/watchweb)                                                  |

> **Important:** The Chrome Extension is required to create watches because it provides the webpage content-selection workflow. The dashboard is used to manage watches and inspect detected changes.

---

# 🚀 Getting Started

## 1. Download the Chrome Extension

Download the latest WatchWeb Chrome Extension:

[⬇️ Download WatchWeb Extension v1.0.0](https://github.com/akshatsiddh-bot/watchweb/releases/download/v1.0.1/watchweb-extension-v1.0.1.zip)

After downloading the ZIP, follow the installation steps below.

---

## 2. Install the Extension in Chrome

WatchWeb is currently distributed as an unpacked Chrome Extension.

### Step 1 — Extract the ZIP

After downloading the release ZIP:

1. Right-click the downloaded ZIP file.
2. Select **Extract All**.
3. Extract it to a folder on your computer.

For example:

```text
C:\Users\YourName\Desktop\watchweb-extension
```

### Step 2 — Open Chrome Extensions

Open:

```text
chrome://extensions
```

### Step 3 — Enable Developer Mode

On the Chrome Extensions page:

1. Find **Developer mode**.
2. Turn it **ON**.

### Step 4 — Load WatchWeb

Click:

**Load unpacked**

Select the extracted WatchWeb extension folder.

For example:

```text
C:\Users\YourName\Desktop\watchweb-extension
```

### Do not select:

```text
watchweb-extension.zip
```

```text
watchweb-extension/extension/
```

```text
watchweb-extension/extension/src/
```

Select the folder that directly contains:

```text
manifest.json
```

### Step 5 — Verify Installation

After loading the extension, you should see:

```text
WatchWeb - Website Change Monitor
```

in the Chrome Extensions page.

You can optionally click the **pin** icon to keep WatchWeb visible in the Chrome toolbar.

---

# 🌐 Live Dashboard

After installing the Chrome Extension, open the WatchWeb dashboard:

**[Open WatchWeb Dashboard](https://watchweb-dashboard.vercel.app)**

The dashboard allows you to:

- View total watches
- View active watches
- View watches with errors
- View detected changes
- View change history
- Inspect before/after differences
- Pause watches
- Resume watches
- Delete watches
- Manually trigger a check
- Manage account settings

Use the **same account** in the extension and dashboard.

---

# 🧭 How to Use WatchWeb

## Step 1 — Register or Log In

Open the WatchWeb Chrome Extension.

Create a new account or log in using an existing WatchWeb account.

---

## Step 2 — Open a Website

Open the public webpage containing the information you want to monitor.

Examples:

```text
Product page
Job listing
Exam schedule
Government notice
College notice
News page
GitHub page
Documentation
Event page
```

---

## Step 3 — Select the Content to Monitor

Open the WatchWeb extension and select:

**Select content on this page**

Move your cursor over the webpage.

WatchWeb highlights selectable sections of the page.

Click the section you want to monitor.

For example:

```text
┌──────────────────────────────┐
│ Product XYZ                  │
│                              │
│ Price: ₹49,999      ← Select │
│                              │
│ In Stock                     │
└──────────────────────────────┘
```

Press `Escape` to cancel the selection.

WatchWeb generates and verifies selectors for the selected content.

---

## Step 4 — Create the Watch

After selecting the content:

1. Enter a name for the watch.
2. Select the checking interval.
3. Configure notification preferences.
4. Create the watch.

The watch is registered through the WatchWeb API and stored in MongoDB.

---

## Step 5 — Monitor the Watch

The server-side monitoring worker periodically checks the target webpage.

The monitoring pipeline is:

```text
Target Website
      ↓
Fetch Page
      ↓
Extract Monitored Content
      ↓
Normalize Dynamic Noise
      ↓
Generate SHA-256 Hash
      ↓
Compare With Previous Snapshot
      ↓
Meaningful Change?
   ↙          ↘
 No            Yes
 ↓              ↓
Finish       Generate Diff
                 ↓
          Classify Change
                 ↓
           Store Change
                 ↓
        Queue Notification
```

---

## Step 6 — Receive a Notification

When a meaningful change is detected, the change becomes available to the Chrome Extension.

The extension periodically checks for pending notifications and displays a native Chrome notification.

```text
Monitoring Worker
       ↓
Change Detected
       ↓
Change Stored
       ↓
Notification Pending
       ↓
Chrome Extension
       ↓
Browser Notification
```

---

## Step 7 — Review the Change

Open the dashboard to inspect the detected change.

WatchWeb provides:

- Previous content
- New content
- Word-level differences
- Change classification
- Detection timestamp
- Change history

For example:

```text
Before:
Price: ₹49,999

After:
Price: ₹44,999

Classification:
price_changed
```

---

# 🏗️ Architecture

```text

                         ┌──────────────────────────────┐
                         │       CHROME EXTENSION       │
                         │                              │
                         │  • Popup                     │
                         │  • Content Script            │
                         │  • Background Service Worker │
                         │  • Content Selection         │
                         │  • Notification Delivery     │
                         └──────────────┬───────────────┘
                                        │
                                        │ HTTPS REST API
                                        │ Bearer JWT
                                        ▼
┌──────────────────────────────┐     ┌──────────────────────────────┐
│        WEB DASHBOARD         │     │       NODE.JS BACKEND        │
│                              │     │          EXPRESS API         │
│  • React                     │────▶│                             │
│  • Vite                      │     │  • Authentication            │
│  • Tailwind CSS              │     │  • Watch Management          │
│  • Watch Management          │     │  • User Management           │
│  • Change History            │     │  • Change History            │
│  • Dashboard Statistics      │     │  • Dashboard Statistics      │
│  • Settings                  │     │  • Notification API          │
└──────────────────────────────┘     │  • SSRF Protection           │
                                     └──────────────┬───────────────┘
                                                    │
                                                    │ Mongoose
                                                    ▼
                                     ┌──────────────────────────────┐
                                     │           MONGODB            │
                                     │                              │
                                     │  • Users                     │
                                     │  • Watches                   │
                                     │  • Snapshots                 │
                                     │  • Changes                   │
                                     │  • Notification State        │
                                     └──────────────┬───────────────┘
                                                    ▲
                                                    │
                                                    │ Database Access
                                                    │
                                     ┌──────────────┴───────────────┐
                                     │       MONITORING WORKER      │
                                     │                              │
                                     │  Scheduler                   │
                                     │      ↓                       │
                                     │  HTTP Fetcher (Axios)        │
                                     │      ↓                       │
                                     │  Playwright Fallback         │
                                     │      ↓                       │
                                     │  Content Extraction          │
                                     │      ↓                       │
                                     │  Noise Normalization         │
                                     │      ↓                       │
                                     │  SHA-256 Hashing             │
                                     │      ↓                       │
                                     │  Word-Level Diff             │
                                     │      ↓                       │
                                     │  Change Classification       │
                                     │      ↓                       │
                                     │  AI Summary (Optional)       │
                                     │      ↓                       │
                                     │  Notification State          │
                                     └──────────────┬───────────────┘
                                                    │
                                                    │ HTTPS
                                                    ▼
                                     ┌──────────────────────────────┐
                                     │       TARGET WEBSITES        │
                                     │                              │
                                     │  • Product Pages             │
                                     │  • Job Listings              │
                                     │  • Exam Schedules            │
                                     │  • News / Notices            │
                                     │  • Documentation             │
                                     │  • Public Web Pages          │
                                     └──────────────────────────────┘
```

### Important Architectural Detail

The Chrome Extension **does not continuously monitor target websites**.

Its responsibilities are primarily:

- User authentication
- Content selection
- Watch creation
- Watch management
- Notification delivery

The actual periodic website monitoring is performed by the **server-side monitoring worker**.

The extension's background service worker periodically requests pending notifications from:

```text
GET /api/notifications/pending
```

and converts them into native Chrome notifications.

---

# 🛠️ Tech Stack

## Chrome Extension

- Manifest V3
- React
- Vanilla JavaScript for content scripts and background service worker
- Vite
- Tailwind CSS
- Chrome Storage API
- Chrome Scripting API
- Chrome Notifications API
- Chrome Alarms API

## Web Dashboard

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React

## Backend

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

## Monitoring Worker

- Node.js
- Axios
- Playwright
- Cheerio
- `diff`
- MongoDB / Mongoose
- Pino
- BullMQ / IORedis dependencies for future queue-based scaling

---

# 📁 Repository Structure

```text
watchweb/
│
├── backend/          # REST API, authentication, watch management,
│                     # authorization and SSRF protection
│
├── worker/           # Monitoring engine:
│                     # fetch → extract → normalize → diff → notify
│
├── dashboard/        # React web dashboard
│
├── extension/        # Chrome Manifest V3 extension
│
├── package.json      # Root workspace configuration
├── package-lock.json
└── README.md
```

---

# 💻 Local Development

## Prerequisites

Install the following before running WatchWeb locally:

- Node.js 18+
- MongoDB 6+
- Google Chrome or Chromium
- Internet access for Playwright browser installation

MongoDB can run:

- Locally
- Through Docker
- Through MongoDB Atlas

---

## Install Dependencies

From the repository root:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

---

# 🔐 Environment Configuration

Create the required environment files:

```text
backend/.env
worker/.env
dashboard/.env
```

Copy the corresponding `.env.example` file into each package and configure the required values.

### MongoDB

For local development:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/watchweb
```

The **backend and worker must use the same MongoDB database**.

### JWT

Configure a strong random secret:

```env
JWT_SECRET=your-long-random-secret
```

Do not commit real secrets to Git.

### Dashboard

Configure the backend API URL:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Extension ID

After loading the extension into Chrome, copy its generated extension ID and configure:

```env
EXTENSION_ID=your-chrome-extension-id
```

See the `.env.example` files for the complete configuration supported by each service.

---

# 🗄️ MongoDB

MongoDB stores:

```text
Users
Watches
Snapshots
Changes
Notification State
```

For local development:

```text
mongodb://127.0.0.1:27017/watchweb
```

The backend and worker must point to the **same database**.

No Redis installation is required for the current MVP scheduler.

---

# Redis / BullMQ

The current MVP does **not require Redis**.

The scheduler currently polls MongoDB directly:

```text
MongoDB
   ↓
MongoDB Polling Scheduler
   ↓
runCheck()
```

BullMQ and IORedis are included as dependencies for a future distributed scheduling architecture:

```text
MongoDB
   ↓
BullMQ / Redis
   ↓
┌──────────┬──────────┬──────────┐
│ Worker 1 │ Worker 2 │ Worker 3 │
└──────────┴──────────┴──────────┘
```

The monitoring and detection pipeline is separated from the scheduling mechanism, allowing the scheduler to be replaced without rewriting the core monitoring logic.

---

# ▶️ Running the System

Run each service in its own terminal.

## Backend

```bash
npm run dev:backend
```

Runs on:

```text
http://localhost:4000
```

## Worker

```bash
npm run dev:worker
```

The worker polls MongoDB for watches that are due for checking.

The default scheduler polling interval is **15 seconds**.

> The scheduler polling interval and a watch's configured check interval are separate concepts. Polling determines how frequently the worker looks for due watches; the watch interval determines when an individual watch should actually be checked.

## Dashboard

```bash
npm run dev:dashboard
```

Runs on:

```text
http://localhost:5173
```

## Extension

```bash
npm run dev:extension
```

The extension build is generated in:

```text
extension/dist
```

---

# 🧩 Loading the Development Extension

After building the extension:

1. Open:

```text
chrome://extensions
```

2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select:

```text
extension/dist
```

5. Copy the generated extension ID.
6. Add it to:

```text
backend/.env
```

as:

```env
EXTENSION_ID=your-chrome-extension-id
```

7. Restart the backend.
8. Reload the extension in Chrome.

The extension can now communicate with the backend using the configured extension identity.

---

# 🔄 Typical End-to-End Workflow

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
Generate / verify selectors
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
        ├──────────────► HTTP Fetch
        │
        └──────────────► Playwright Fallback
                              │
                              ▼
                       Extract Content
                              │
                              ▼
                       Normalize Noise
                              │
                              ▼
                       SHA-256 Hash
                              │
                              ▼
                       Compare Snapshot
                              │
                              ▼
                        Generate Diff
                              │
                              ▼
                      Classify Change
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
          Price Change   Availability    Text Change
                              │
                              ▼
                         Store Change
                              │
                              ▼
                    Notification Pending
                              │
                              ▼
                       Chrome Extension
                              │
                              ▼
                    Browser Notification
                              │
                              ▼
                         Dashboard
```

---

# ⚙️ Monitoring Engine

## Fetch Strategy

WatchWeb uses a two-stage fetching strategy.

First, the worker attempts to retrieve the page using Axios.

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

When JavaScript rendering is determined to be required, the watch records this in:

```text
watch.requiresJs
```

so subsequent checks can use the appropriate fetching strategy.

Playwright uses:

- A shared browser process
- Separate browser contexts per check
- Configurable concurrency
- Navigation timeouts
- Resource blocking for unnecessary resources such as images, media, and fonts

---

# 🎯 Content Extraction

WatchWeb attempts content extraction using:

1. Primary CSS selector
2. Stored fallback selectors
3. Selector failure

If the selected element disappears, WatchWeb **does not silently switch to whole-page monitoring**.

Instead, it records the selector failure so the watch can be repaired.

This prevents a broken selector from producing misleading change events.

---

# 🧹 Content Normalization

Webpages often contain dynamic values that change without representing meaningful content changes.

WatchWeb therefore performs conservative normalization.

Common noise sources include:

- ISO timestamps
- Relative timestamps such as `5 minutes ago`
- `Last updated:` lines
- View counters
- Visitor counters
- Long UUID-like identifiers
- Long hexadecimal identifiers

Plain numbers are **not automatically removed** because numbers can represent meaningful information such as:

- Prices
- Dates
- Quantities
- Counts
- Deadlines
- Scores

The normalization process is intentionally conservative to reduce false positives.

---

# 🔍 Change Detection

After extraction and normalization, WatchWeb generates a SHA-256 hash of the monitored content.

```text
Normalized Content
        ↓
     SHA-256
        ↓
Compare With Previous Hash
```

If the hashes are identical, no content change is recorded.

If the hashes differ, WatchWeb generates a word-level diff.

---

# 🏷️ Change Classification

Detected changes can be classified as:

```text
price_changed
availability_changed
text_added
text_removed
text_modified
structure_changed
```

Price detection is currency-symbol aware.

Large-scale changes affecting more than approximately **60% of the monitored content** can be classified as structural changes.

---

# ❌ Failure Handling

A failed website check is **never treated as a content change**.

Possible failures include:

- DNS failures
- Connection failures
- HTTP failures
- Request timeouts
- Playwright failures
- Selector-not-found errors

When a check fails:

```text
Check Failure
     ↓
Record Failure
     ↓
Update Watch Error State
     ↓
Store lastError
```

No `Change` record is created for a failed check.

After the configured number of consecutive failures, the watch enters an error state.

This prevents temporary website failures from generating false alerts.

---

# 🗑️ Snapshot Retention

A cleanup process removes snapshots older than:

```text
SNAPSHOT_RETENTION_DAYS
```

The current snapshot for every watch is preserved.

This keeps historical storage under control while retaining the latest state required for future comparisons.

---

# 🔒 Security

Security is particularly important because WatchWeb performs server-side requests to user-provided URLs.

## Password Security

Passwords are hashed using **Argon2id**.

Plaintext passwords are never stored or logged.

---

## Authentication

WatchWeb uses stateless JWT authentication.

A `tokenVersion` value allows previously issued tokens to be invalidated when required, including:

- Password changes
- Logout from all devices
- Account security events

---

## Authorization

Protected resources are scoped to the authenticated user's ID.

The user ID is obtained from the verified JWT rather than client-supplied request data.

Cross-user resource access returns `404` instead of `403` to avoid revealing whether another user's resource exists.

---

## SSRF Protection

Because the worker fetches arbitrary URLs, WatchWeb implements SSRF protection in both the backend and worker.

Blocked destinations include:

- Loopback addresses
- Private network ranges
- CGNAT ranges
- Link-local addresses
- Cloud metadata addresses such as `169.254.169.254`
- Unsupported URL schemes

SSRF validation occurs:

1. When creating a watch
2. Immediately before fetching a target
3. After every redirect

Redirect validation is critical because a public URL can redirect to an internal or cloud metadata address.

Only the following schemes are supported:

```text
http://
https://
```

---

## Rate Limiting

The backend applies:

- Global API rate limiting
- Stricter rate limiting for authentication endpoints

---

## Resource Limits

WatchWeb limits resource consumption using controls such as:

- Maximum watches per user
- Minimum check interval
- Maximum response size
- Maximum page-load time
- Maximum concurrent Playwright pages
- Maximum stored content size

---

# 🧩 Chrome Extension Permissions

The extension uses:

```text
storage
activeTab
scripting
notifications
alarms
```

It does **not** request:

```text
tabs
history
cookies
webRequest
```

There is also no persistent content script running on every website.

The content-selection script is injected only when the user explicitly starts content selection.

---

# 🔑 Token Handling

The JWT is managed by the extension's background service worker.

The popup and content script communicate with the background worker through Chrome runtime messages rather than directly accessing the JWT.

This keeps authentication state centralized within the extension's background layer.

---

# 📡 API

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/logout-all
GET  /api/auth/me
```

## Watches

```text
GET    /api/watches
POST   /api/watches
GET    /api/watches/:id
PATCH  /api/watches/:id
DELETE /api/watches/:id
POST   /api/watches/:id/pause
POST   /api/watches/:id/resume
POST   /api/watches/:id/check
```

## Changes

```text
GET /api/watches/:id/changes
GET /api/changes/:id
```

## Dashboard

```text
GET /api/dashboard/stats
```

## Notifications

```text
GET  /api/notifications/pending
POST /api/notifications/:id/ack
```

## User Settings

```text
PATCH /api/users/me
POST  /api/users/me/change-password
POST  /api/users/me/delete-account
```

The public endpoints are:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/health
```

Protected application endpoints require authentication.

---

# 🧪 Testing

## Backend Tests

```bash
npm run test:backend
```

## Worker Tests

```bash
npm run test:worker
```

## Complete Test Suite

```bash
npm test
```

## Linting

```bash
npm run lint
```

---

# ✅ What Is Tested

## Backend

Tests cover areas including:

- Authentication
- Password hashing
- JWT authentication
- Watch ownership
- Authorization
- SSRF protection

## Worker

Tests cover:

- Content extraction
- Selector fallback
- Noise normalization
- SHA-256 hashing
- Word-level diffing
- Price detection
- Availability detection
- Text additions
- Text removals
- Text modifications
- Structural changes
- Dynamic timestamp filtering
- Fetcher SSRF protection

---

# ⚠️ Monitoring Limitations

WatchWeb cannot reliably monitor every website.

Monitoring may fail for websites that:

- Require authentication
- Require private browser sessions
- Block automated requests
- Use CAPTCHA or anti-bot systems
- Require browser interactions the worker cannot reproduce
- Render content using unsupported techniques
- Continuously mutate content in ways that are difficult to distinguish from meaningful changes
- Remove or significantly change the monitored element

A webpage being accessible in a user's Chrome browser **does not guarantee that the same webpage can be accessed by the server-side monitoring worker**.

When a check fails or a selector disappears, WatchWeb records the failure rather than creating a false change event.

---

# 📌 Known Limitations

## Scheduler

The MVP scheduler uses direct MongoDB polling rather than BullMQ/Redis.

This architecture is suitable for a single worker process and uses optimistic claiming to reduce duplicate processing.

For horizontal worker scaling, a distributed queue such as BullMQ with Redis should eventually replace the current scheduler.

---

## XPath

XPath support is currently limited.

CSS selectors are the primary selector mechanism.

---

## AI Summaries

AI-generated summaries are optional.

The current implementation supports Anthropic through:

```env
AI_PROVIDER=anthropic
```

When AI is disabled or unavailable, WatchWeb uses a deterministic summary generator.

AI is an enhancement layer only. It does **not** determine whether a page changed.

Change detection remains deterministic.

---

## Notifications

The current notification channel is browser notifications delivered through the Chrome Extension.

The notification architecture can be extended later to support channels such as:

- Email
- Telegram
- Discord

---

## End-to-End Verification

Some end-to-end scenarios require a live MongoDB instance and a working Playwright browser environment.

A complete local verification should cover:

```text
Create Watch
     ↓
Worker Check
     ↓
Create Snapshot
     ↓
Modify Target Website
     ↓
Detect Change
     ↓
Store Change
     ↓
Generate Notification
     ↓
Browser Notification
     ↓
Dashboard Change History
```

---

# 🚀 Recommended Future Improvements

1. Replace MongoDB polling with BullMQ/Redis when horizontal worker scaling becomes necessary.
2. Add email, Telegram, and Discord notification channels.
3. Expand XPath support if real-world usage demonstrates a need.
4. Add Playwright-based end-to-end tests covering extension → backend → worker → dashboard.
5. Add selector re-validation and repair suggestions when monitored elements disappear.
6. Add watch-health diagnostics showing successful checks, failures, selector status, and last successful fetch.
7. Add clearer monitoring states such as `active`, `paused`, and `error`.
8. Improve monitoring support for JavaScript-heavy and interaction-dependent websites.
9. Add configurable retry and backoff strategies for transient monitoring failures.
10. Add distributed worker execution when monitoring volume grows.

---

# 📋 Quick Start Summary

For the **live version**:

```text
1. Download the Chrome Extension
        ↓
2. Extract the ZIP
        ↓
3. Open chrome://extensions
        ↓
4. Enable Developer Mode
        ↓
5. Load unpacked
        ↓
6. Select the extracted folder containing manifest.json
        ↓
7. Open the WatchWeb Extension
        ↓
8. Register / Login
        ↓
9. Open a public webpage
        ↓
10. Select content to monitor
        ↓
11. Create the Watch
        ↓
12. Open the Live Dashboard
        ↓
13. Wait for a detected change
        ↓
14. Review the before/after diff
```

For **local development**:

```text
npm install
npx playwright install chromium
```

Then configure:

```text
backend/.env
worker/.env
dashboard/.env
```

and run:

```text
npm run dev:backend
npm run dev:worker
npm run dev:dashboard
npm run dev:extension
```

---

---

## WatchWeb

**Select what matters. Detect what changed. Know when it changes.**
