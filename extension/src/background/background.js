import { API_BASE_URL, NOTIFICATION_POLL_ALARM, NOTIFICATION_POLL_PERIOD_MINUTES } from './utils/config.js';

// --- Token storage (background is the ONLY place the JWT is read/written) ---
async function getToken() {
  const { watchweb_token } = await chrome.storage.local.get('watchweb_token');
  return watchweb_token || null;
}
async function setToken(token) {
  await chrome.storage.local.set({ watchweb_token: token });
}
async function clearToken() {
  await chrome.storage.local.remove(['watchweb_token', 'watchweb_user']);
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const error = new Error(body?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.details = body?.details;
    throw error;
  }
  return body;
}

const handlers = {
  async LOGIN({ email, password }) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    await setToken(data.token);
    await chrome.storage.local.set({ watchweb_user: data.user });
    return { user: data.user };
  },

  async REGISTER({ name, email, password }) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await setToken(data.token);
    await chrome.storage.local.set({ watchweb_user: data.user });
    return { user: data.user };
  },

  async LOGOUT() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore - logging out client-side regardless
    }
    await clearToken();
    return { success: true };
  },

  async GET_ME() {
    const token = await getToken();
    if (!token) return { user: null };
    try {
      const data = await apiFetch('/auth/me');
      return { user: data.user };
    } catch {
      await clearToken();
      return { user: null };
    }
  },

  async LIST_WATCHES() {
    const data = await apiFetch('/watches');
    return { watches: data.watches };
  },

  async CREATE_WATCH(payload) {
    const token = await getToken();
    if (!token) return { needsAuth: true };
    const data = await apiFetch('/watches', { method: 'POST', body: JSON.stringify(payload) });
    return { watch: data.watch };
  },

  async PAUSE_WATCH({ id }) {
    const data = await apiFetch(`/watches/${id}/pause`, { method: 'POST' });
    return { watch: data.watch };
  },

  async RESUME_WATCH({ id }) {
    const data = await apiFetch(`/watches/${id}/resume`, { method: 'POST' });
    return { watch: data.watch };
  },

  async DELETE_WATCH({ id }) {
    await apiFetch(`/watches/${id}`, { method: 'DELETE' });
    return { success: true };
  },

  async LIST_RECENT_CHANGES({ watchId }) {
    const data = await apiFetch(`/watches/${watchId}/changes?limit=10`);
    return { changes: data.changes };
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;

  handler(message.payload || {})
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((err) => sendResponse({ ok: false, error: err.message, status: err.status }));

  return true; // keep the message channel open for the async response
});

// --- Notification polling ---
// The worker (server-side) marks Changes as notificationStatus='pending'.
// This background service worker periodically polls a lightweight endpoint
// and turns pending changes into real browser notifications - this is NOT
// monitoring target websites from the client (that remains server-side
// only), it's just checking our own backend for delivery.
chrome.alarms.create(NOTIFICATION_POLL_ALARM, { periodInMinutes: NOTIFICATION_POLL_PERIOD_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== NOTIFICATION_POLL_ALARM) return;
  const token = await getToken();
  if (!token) return;

  try {
    const data = await apiFetch('/notifications/pending');
    for (const change of data.changes || []) {
      const watchName = change.watchId?.name || 'A watched page';
      chrome.notifications.create(`watchweb-change-${change._id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'WatchWeb detected a change',
        message: `${watchName}: ${change.summary}`,
      });
      // Store the mapping so a notification click can deep-link to the change.
      await chrome.storage.local.set({
        [`watchweb_notif_${change._id}`]: { watchId: change.watchId?._id, changeId: change._id },
      });
      await apiFetch(`/notifications/${change._id}/ack`, { method: 'POST' });
    }
  } catch {
    // Silently skip this poll cycle (e.g. offline, token expired); next
    // alarm tick will retry.
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith('watchweb-change-')) return;
  const changeId = notificationId.replace('watchweb-change-', '');
  const key = `watchweb_notif_${changeId}`;
  const stored = await chrome.storage.local.get(key);
  const info = stored[key];
  const dashboardUrl = info?.watchId
    ? `http://localhost:5173/watches/${info.watchId}`
    : 'http://localhost:5173/watches';
  chrome.tabs.create({ url: dashboardUrl });
  chrome.notifications.clear(notificationId);
  chrome.storage.local.remove(key);
});
