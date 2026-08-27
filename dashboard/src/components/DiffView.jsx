export default function DiffView({ diff = [] }) {
  if (!diff.length) {
    return <p className="text-sm text-slate-500">No diff available for this change.</p>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed">
      {diff.map((part, idx) => {
        if (part.type === 'added') {
          return (
            <ins
              key={idx}
              className="rounded bg-emerald-100 px-0.5 text-emerald-800 no-underline"
            >
              {part.value}
            </ins>
          );
        }
        if (part.type === 'removed') {
          return (
            <del key={idx} className="rounded bg-red-100 px-0.5 text-red-700">
              {part.value}
            </del>
          );
        }
        return <span key={idx}>{part.value}</span>;
      })}
    </div>
  );
}
