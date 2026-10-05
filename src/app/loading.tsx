/** Route-level loading skeleton shown while a Server Component streams. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-64 rounded-lg bg-white/10" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-white/10 bg-navy-900/60" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="h-72 rounded-xl border border-white/10 bg-navy-900/60 lg:col-span-2" />
        <div className="h-72 rounded-xl border border-white/10 bg-navy-900/60" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
