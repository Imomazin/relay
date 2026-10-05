import type { Metadata } from "next";
import "./globals.css";
import { Brand, SidebarNav, TopNav } from "@/components/nav";
import { NotificationsBell } from "@/components/notifications-bell";
import { APP_NAME } from "@/lib/app-config";

export const metadata: Metadata = {
  title: {
    default: "Relay — Service-Management Orchestration",
    template: "%s · Relay",
  },
  description:
    "Relay is an intelligent service-management orchestration layer: event correlation, triage, safe automation and capacity intelligence. CivTech 12.2 demonstrator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-theme="dark">
      <body className="min-h-screen bg-navy-950 text-slate-200">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-500 focus:px-4 focus:py-2 focus:text-navy-950"
        >
          Skip to content
        </a>
        <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-white/10 bg-navy-900/40 px-4 py-6 lg:flex">
            <Brand />
            <SidebarNav />
            <div className="mt-auto rounded-lg border border-white/10 bg-navy-900/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <p className="font-semibold text-slate-400">{APP_NAME} · Demonstrator</p>
              <p className="mt-1">All telemetry synthetic. Connectors simulated. CivTech 12.2.</p>
            </div>
          </aside>

          {/* Mobile top bar */}
          <div className="border-b border-white/10 bg-navy-900/60 px-4 py-3 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <Brand />
              <span className="text-[10px] uppercase tracking-widest text-slate-500">CivTech 12.2</span>
            </div>
            <TopNav />
          </div>

          <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center justify-end">
              <NotificationsBell />
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
