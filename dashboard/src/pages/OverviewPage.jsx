import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, CheckCircle2, AlertTriangle, GitCompare } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { getDashboardStats } from '../services/watchService';
import { timeAgo } from '../utils/format';

function StatCard({ icon: Icon, label, value, tone = 'slate' }) {
  const toneClasses = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    violet: 'bg-violet-100 text-violet-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Overview</h1>
      <p className="mb-6 text-sm text-slate-500">A snapshot of everything you&apos;re watching.</p>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={Eye} label="Total watches" value={stats.totalWatches} />
            <StatCard icon={CheckCircle2} label="Active" value={stats.activeWatches} tone="emerald" />
            <StatCard icon={AlertTriangle} label="With errors" value={stats.watchesWithErrors} tone="red" />
            <StatCard icon={GitCompare} label="Changes detected" value={stats.changesDetected} tone="violet" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent changes</h2>
            </div>
            {stats.recentChanges.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No changes detected yet. They&apos;ll show up here as soon as one of your watches sees something new.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.recentChanges.map((change) => (
                  <li key={change._id}>
                    <Link
                      to={`/watches/${change.watchId?._id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {change.watchId?.name || 'Deleted watch'}
                        </p>
                        <p className="truncate text-xs text-slate-500">{change.summary}</p>
                      </div>
                      <span className="ml-4 shrink-0 text-xs text-slate-400">
                        {timeAgo(change.detectedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
