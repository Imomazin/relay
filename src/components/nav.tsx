"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Command Centre" },
  { href: "/services", label: "Services" },
  { href: "/events", label: "Events" },
  { href: "/incidents", label: "Incidents" },
  { href: "/automations", label: "Automations" },
  { href: "/capacity", label: "Capacity" },
  { href: "/integrations", label: "Integrations" },
  { href: "/audit", label: "Audit" },
  { href: "/methodology", label: "Methodology" },
  { href: "/demo", label: "Demo" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Relay home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-navy-950 font-bold">R</span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-white">Relay</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Orchestration</span>
      </span>
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-teal-500/10 text-teal-300 ring-1 ring-inset ring-teal-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex gap-1 overflow-x-auto pb-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-teal-500/10 text-teal-300 ring-1 ring-inset ring-teal-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
