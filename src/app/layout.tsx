import type { Metadata } from "next";
import "./globals.css";
import { Brand, SidebarNav, TopNav, GlobalSearch, LiveClock } from "@/components/nav";
import { NotificationsBell } from "@/components/notifications-bell";

export const metadata: Metadata = {
  title: {
    default: "Relay — Service Control Centre",
    template: "%s · Relay",
  },
  description:
    "Relay is a service-management orchestration platform: event correlation, incident triage, workflow, escalation, safe automation and operational intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-teal-400 focus:px-4 focus:py-2 focus:text-navy-950"
        >
          Skip to content
        </a>

        <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
          {/* Sidebar (desktop) */}
          <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-6 overflow-y-auto border-r bg-[var(--surface)] px-3.5 py-5 lg:flex" style={{ borderColor: "var(--line)" }}>
            <Brand />
            <SidebarNav />
            <div className="mt-auto rounded-md border px-3 py-2.5 text-[10px] leading-relaxed text-slate-500" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-status-healthy" /> Operational
              </div>
              <p className="mt-1">CivTech 12.2 · synthetic operating environment</p>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Command bar */}
            <header className="sticky top-0 z-40 border-b bg-[var(--app-bg)] backdrop-blur" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
                <div className="lg:hidden">
                  <Brand />
                </div>
                <div className="hidden flex-1 lg:block">
                  <GlobalSearch />
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <LiveClock />
                  <NotificationsBell />
                </div>
              </div>
              {/* Mobile: search + nav */}
              <div className="space-y-2 px-4 pb-2.5 lg:hidden">
                <GlobalSearch />
                <TopNav />
              </div>
            </header>

            <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
