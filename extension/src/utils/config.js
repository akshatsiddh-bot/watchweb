// Centralized configuration. In a real deployment this would be swapped for
// the production API URL at build time (e.g. via a Vite env var per build
// target); kept here as a single constant for clarity in this codebase.
export const API_BASE_URL = "https://watchweb.onrender.com/api";

export const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "24 hours" },
];

export const NOTIFICATION_POLL_ALARM = "watchweb-notification-poll";
export const NOTIFICATION_POLL_PERIOD_MINUTES = 2;
