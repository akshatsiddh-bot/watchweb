import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DiffView from '../components/DiffView.jsx';
import {
  getWatch,
  listChanges,
  pauseWatch,
  resumeWatch,
  checkWatchNow,
  deleteWatch,
} from '../services/watchService';
import { formatDate, timeAgo, INTERVAL_LABELS } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function WatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [watch, setWatch] = useState(null);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [changes, setChanges] = useState([]);
  const [selectedChangeIdx, setSelectedChangeIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [watchData, changeList] = await Promise.all([getWatch(id), listChanges(id)]);
      setWatch(watchData.watch);
      setLatestSnapshot(watchData.latestSnapshot);
      setChanges(changeList);
    } catch {
      setError('Could not load this watch.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action) {
    setBusy(true);
    try {
      if (action === 'pause') await pauseWatch(id);
      if (action === 'resume') await resumeWatch(id);
      if (action === 'check') await checkWatchNow(id);
      if (action === 'delete') {
        if (!window.confirm('Delete this watch? This cannot be undone.')) {
          setBusy(false);
          return;
        }
        await deleteWatch(id);
        navigate('/watches');
        return;
      }
      await load();
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-slate-500">Loading…</p>
      </DashboardLayout>
    );
  }

  if (error || !watch) {
    return (
      <DashboardLayout>
        <p className="text-sm text-red-600">{error || 'Watch not found.'}</p>
      </DashboardLayout>
    );
  }

  const selectedChange = changes[selectedChangeIdx];

  return (
    <DashboardLayout>
      <Link to="/watches" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to watches
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{watch.name}</h1>
            <StatusBadge status={watch.status} />
          </div>
          <a
            href={watch.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {watch.url}
          </a>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            disabled={busy}
            onClick={() => handleAction('check')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Check now
          </button>
          {watch.status === 'paused' ? (
            <button
              disabled={busy}
              onClick={() => handleAction('resume')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => handleAction('pause')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => handleAction('delete')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <InfoBox label="Interval" value={INTERVAL_LABELS[watch.interval] || `${watch.interval}m`} />
        <InfoBox label="Last checked" value={timeAgo(watch.lastCheckedAt)} />
        <InfoBox label="Last changed" value={timeAgo(watch.lastChangedAt)} />
        <InfoBox label="Next check" value={timeAgo(watch.nextCheckAt)} />
      </div>

      {watch.status === 'error' && watch.lastError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {watch.lastError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Change history</h2>
          <div className="space-y-1">
            {changes.length === 0 && (
              <p className="text-sm text-slate-500">No changes detected yet.</p>
            )}
            {changes.map((change, idx) => (
              <button
                key={change._id}
                onClick={() => setSelectedChangeIdx(idx)}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  idx === selectedChangeIdx
                    ? 'border-brand-300 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{formatDate(change.detectedAt)}</div>
                <div className="truncate text-xs opacity-80">{change.summary}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {selectedChange ? 'Diff' : 'Current content'}
          </h2>
          {selectedChange ? (
            <div>
              <p className="mb-3 text-sm text-slate-700">{selectedChange.summary}</p>
              <DiffView diff={selectedChange.diff} />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {latestSnapshot?.content || 'No content captured yet.'}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
