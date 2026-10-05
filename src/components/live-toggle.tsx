"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Live event feed control. When "live", refreshes the server component on an
 * interval so newly-aged events and the "last hour" window update. Pausing
 * stops the refresh — useful when inspecting the feed during a demo.
 */
export function LiveToggle({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      router.refresh();
      setTick((t) => t + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs, router]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLive((v) => !v)}
        aria-pressed={live}
        className={cn("btn-ghost", live && "border-teal-500/40 text-teal-400")}
      >
        <span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse bg-teal-400" : "bg-slate-500")} aria-hidden />
        {live ? "Live" : "Paused"}
      </button>
      <button type="button" onClick={() => router.refresh()} className="btn-ghost">Refresh</button>
      {live ? <span className="text-xs text-slate-500">auto every {intervalMs / 1000}s · {tick}</span> : null}
    </div>
  );
}
