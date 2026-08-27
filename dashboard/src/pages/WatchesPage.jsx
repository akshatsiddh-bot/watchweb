import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  listWatches,
  pauseWatch,
  resumeWatch,
  deleteWatch,
  checkWatchNow,
} from '../services/watchService';
import { timeAgo } from '../utils/format';

export default function WatchesPage() {
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setWatches(await listWatches());
    } catch {
      setError('Could not load watches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(id, action) {
    setBusyId(id);
    try {
      if (action === 'pause') await pauseWatch(id);
      if (action === 'resume') await resumeWatch(id);
      if (action === 'check') await checkWatchNow(id);
      if (action === 'delete') {
        if (!window.confirm('Delete this watch? This cannot be undone.')) return;
        await deleteWatch(id);
      }
      await load();
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Watches</h1>
          <p className="text-sm text-slate-500">Everything you&apos;re currently monitoring.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && watches.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            No watches yet. Create one from the WatchWeb browser extension on any page you want to
            monitor.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {watches.map((watch) => (
          <div
            key={watch._id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
          >
            <Link to={`/watches/${watch._id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-slate-900">{watch.name}</p>
                <StatusBadge status={watch.status} />
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {watch.url}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Last checked {timeAgo(watch.lastCheckedAt)} · Last changed {timeAgo(watch.lastChangedAt)} ·
                Next check {timeAgo(watch.nextCheckAt)}
              </p>
            </Link>

            <div className="ml-4 flex shrink-0 items-center gap-1">
              <button
                title="Check now"
                disabled={busyId === watch._id}
                onClick={() => handleAction(watch._id, 'check')}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {watch.status === 'paused' ? (
                <button
                  title="Resume"
                  disabled={busyId === watch._id}
                  onClick={() => handleAction(watch._id, 'resume')}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                </button>
              ) : (
                <button
                  title="Pause"
                  disabled={busyId === watch._id}
                  onClick={() => handleAction(watch._id, 'pause')}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button
                title="Delete"
                disabled={busyId === watch._id}
                onClick={() => handleAction(watch._id, 'delete')}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
