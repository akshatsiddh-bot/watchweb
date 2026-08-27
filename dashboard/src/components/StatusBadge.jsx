const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  checking: 'bg-blue-50 text-blue-700 border-blue-200',
  changed: 'bg-violet-50 text-violet-700 border-violet-200',
};

const STATUS_LABELS = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
  checking: 'Checking',
  changed: 'Changed',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
