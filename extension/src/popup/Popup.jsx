import { useEffect, useState } from "react";
import {
  Radar,
  Eye,
  Plus,
  LogOut,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { sendMessage } from "../services/messaging.js";

const DASHBOARD_URL = "https://watchweb-dashboard.vercel.app";

function StatusDot({ status }) {
  const colors = {
    active: "bg-emerald-500",
    paused: "bg-amber-500",
    error: "bg-red-500",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-slate-400"}`}
    />
  );
}

function AuthView({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res =
        mode === "login"
          ? await sendMessage("LOGIN", { email, password })
          : await sendMessage("REGISTER", { name, email, password });
      onAuthed(res.user);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Radar className="h-5 w-5 text-brand-600" />
        <span className="font-semibold text-slate-900">WatchWeb</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {mode === "register" && (
          <input
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>
      <button
        className="mt-3 w-full text-center text-xs text-slate-500 hover:underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login"
          ? "Don't have an account? Register"
          : "Already have an account? Log in"}
      </button>
    </div>
  );
}

function WatchesView({ user, onLogout }) {
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selecting, setSelecting] = useState(false);

  async function loadWatches() {
    try {
      const res = await sendMessage("LIST_WATCHES");
      setWatches(res.watches);
    } catch {
      setError("Could not load watches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWatches();
  }, []);

  async function handleSelectContent() {
    setSelecting(true);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      window.close(); // selection happens on the page itself; nothing more to do in the popup
    } finally {
      setSelecting(false);
    }
  }

  async function handleAction(id, action) {
    setBusyId(id);
    try {
      if (action === "pause") await sendMessage("PAUSE_WATCH", { id });
      if (action === "resume") await sendMessage("RESUME_WATCH", { id });
      if (action === "delete") await sendMessage("DELETE_WATCH", { id });
      await loadWatches();
    } catch {
      setError("Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-brand-600" />
          <span className="font-semibold text-slate-900">WatchWeb</span>
        </div>
        <button
          title="Log out"
          onClick={onLogout}
          className="text-slate-400 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={handleSelectContent}
          disabled={selecting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Select content on this page
        </button>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-slate-100 px-3 pb-3">
        {loading && (
          <p className="pt-3 text-center text-xs text-slate-500">Loading…</p>
        )}
        {error && (
          <p className="pt-3 text-center text-xs text-red-600">{error}</p>
        )}
        {!loading && watches.length === 0 && (
          <p className="pt-6 text-center text-xs text-slate-500">
            No watches yet. Click &quot;Select content&quot; on any page to
            create one.
          </p>
        )}
        <ul className="space-y-2 pt-2">
          {watches.map((w) => (
            <li
              key={w._id}
              className="rounded-lg border border-slate-200 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <StatusDot status={w.status} />
                <span className="truncate text-sm font-medium text-slate-900">
                  {w.name}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                {w.url}
              </p>
              <div className="mt-1.5 flex gap-1">
                {w.status === "paused" ? (
                  <button
                    disabled={busyId === w._id}
                    onClick={() => handleAction(w._id, "resume")}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    disabled={busyId === w._id}
                    onClick={() => handleAction(w._id, "pause")}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  disabled={busyId === w._id}
                  onClick={() => handleAction(w._id, "delete")}
                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" /> Open dashboard
        </button>
      </div>
    </div>
  );
}

export default function Popup() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    sendMessage("GET_ME")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await sendMessage("LOGOUT").catch(() => {});
    setUser(null);
  }

  if (user === undefined) {
    return (
      <div className="p-6 text-center text-xs text-slate-500">Loading…</div>
    );
  }

  if (!user) {
    return <AuthView onAuthed={setUser} />;
  }

  return <WatchesView user={user} onLogout={handleLogout} />;
}
