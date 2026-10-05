"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-severity-high">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Relay hit an error</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        This is a demonstrator. If the database is not reachable or not yet seeded, check
        <code className="mx-1 rounded bg-navy-950 px-1.5 py-0.5 text-teal-400">DATABASE_URL</code>
        and the migration/seed steps in the README.
      </p>
      {error?.digest ? <p className="mt-2 text-xs text-slate-600">digest: {error.digest}</p> : null}
      <button type="button" onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
