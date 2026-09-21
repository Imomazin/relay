import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The page or record you requested does not exist in this demonstrator.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to Command Centre
      </Link>
    </div>
  );
}
