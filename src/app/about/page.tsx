import { Card, CardBody, PageHeader, SectionTitle, Chip } from "@/components/ui";
import { APP_NAME, CIVTECH_CHALLENGE, CIVTECH_SPONSOR, PARTNERSHIP } from "@/lib/app-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title={`About ${APP_NAME}`}
        description="An intelligent service-management orchestration layer that helps digital public-service providers scale operations without scaling service-management staffing linearly."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardBody>
          <SectionTitle>Product thesis</SectionTitle>
          <p className="text-sm text-slate-300">Relay sits alongside existing monitoring and service-management platforms. It ingests and normalises events, correlates them into incidents, triages by severity and impact, recommends runbooks, and executes safe, human-approved automation — with a full audit trail and capacity intelligence.</p>
          <p className="mt-2 text-sm text-slate-400">It is <strong>not</strong> a replacement for existing platforms; it is an orchestration layer that reduces the linear relationship between operational complexity and service-management headcount.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>CivTech challenge</SectionTitle>
          <p className="text-sm text-slate-300"><strong>{CIVTECH_CHALLENGE}</strong> — sponsored by the {CIVTECH_SPONSOR}.</p>
          <p className="mt-2 text-sm text-slate-400">&ldquo;How can technology enable fast-growing digital public service providers to dynamically scale their service-management capabilities?&rdquo;</p>
          <p className="mt-2 text-sm text-slate-400">Partnership context: {PARTNERSHIP}.</p>
          <p className="mt-2 text-xs text-slate-500">Referenced systems (accounted for architecturally, simulated here): Jira Service Desk, AWS CloudWatch, Exabeam, CrowdStrike.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>Technical stack</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {["Next.js (App Router)", "TypeScript", "Tailwind CSS", "Neon PostgreSQL", "Drizzle ORM", "Zod", "Recharts", "Server Components", "Server Actions", "Vitest"].map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
          <p className="mt-3 text-sm text-slate-400">Deterministic engines (normalisation, correlation, triage, runbook recommendation, capacity) run without any external LLM API. AI extension points are documented for a future accelerator.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>Documentation</SectionTitle>
          <ul className="grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
            {["README.md", "docs/architecture.md", "docs/civtech-alignment.md", "docs/data-model.md", "docs/orchestration-methodology.md", "docs/integration-architecture.md", "docs/automation-safety.md", "docs/responsible-ai.md", "docs/security.md", "docs/demo-script.md", "docs/known-limitations.md"].map((d) => (
              <li key={d} className="flex gap-2"><span className="text-teal-500">›</span><span className="text-slate-400">{d}</span></li>
            ))}
          </ul>
        </CardBody></Card>
      </div>

      <Card className="mt-6 border-severity-medium/20"><CardBody>
        <SectionTitle>Disclaimer</SectionTitle>
        <div className="space-y-1.5 text-sm text-slate-400">
          <p>Relay is a product demonstrator.</p>
          <p>All service telemetry is synthetic.</p>
          <p>Displayed connectors are simulated unless specifically stated otherwise.</p>
          <p>Automation operates only against demonstration services.</p>
          <p>Prototype recommendations are decision-support outputs.</p>
          <p className="text-slate-500">This does not imply Scottish Government or CivTech endorsement.</p>
        </div>
      </CardBody></Card>
    </div>
  );
}
