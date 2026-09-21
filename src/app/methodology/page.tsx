import { Card, CardBody, PageHeader, SectionTitle, Chip, DemoDisclaimer } from "@/components/ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <div>
      <PageHeader
        title="Orchestration Methodology"
        description="Relay's correlation, triage and runbook logic is deterministic and transparent by design — every recommendation can be explained. No external AI is required."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardBody>
          <SectionTitle>1 · Normalisation</SectionTitle>
          <p className="text-sm text-slate-300">Each source adapter maps its native payload onto a single normalised event: source, service, severity (mapped onto a five-level scale), a normalised category (latency, error rate, saturation, availability, security, capacity, dependency, authentication) and a stable correlation key <Chip>service:category</Chip>.</p>
          <p className="mt-2 text-sm text-slate-400">Severity is derived from the source&apos;s own vocabulary first, then keyword inspection of the message as a fallback.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>2 · Correlation</SectionTitle>
          <p className="text-sm text-slate-300">Events on the same service within a 30-minute window are grouped into a candidate incident. Grouping by service — not by exact signal — lets a latency alarm, an HTTP 500 spike and citizen tickets collapse into one incident.</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li className="flex gap-2"><span className="text-teal-500">›</span>Same service, shared correlation key, time proximity</li>
            <li className="flex gap-2"><span className="text-teal-500">›</span>Similar error category, shared infrastructure dependency</li>
            <li className="flex gap-2"><span className="text-teal-500">›</span>Corroboration across multiple monitoring sources</li>
          </ul>
          <p className="mt-2 text-sm text-slate-400">Each factor contributes weighted points to a transparent correlation confidence (0–99%).</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>3 · Triage</SectionTitle>
          <p className="text-sm text-slate-300">Severity starts from the peak event severity, then escalates for tier-1 services, wide blast radius, multi-source corroboration and security-sensitive categories. Estimated user impact is a bounded function of the service&apos;s monthly active users, severity and category.</p>
          <p className="mt-2 text-sm text-slate-400">Approval is <em>required</em> for high/critical severity, tier-1 services, or security/authentication categories.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>4 · Runbook recommendation</SectionTitle>
          <p className="text-sm text-slate-300">The triaged category maps to the best-fit runbook, ranked by category match, service applicability and synthetic success rate, preferring lower-risk options. High-risk runbooks and high-severity incidents always require human approval.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>5 · Safe automation</SectionTitle>
          <p className="text-sm text-slate-300">Approved runbooks execute as fully simulated steps against demonstration services only. Every step, approval and outcome is written to the audit trail. Nothing touches real infrastructure.</p>
        </CardBody></Card>

        <Card><CardBody>
          <SectionTitle>6 · Capacity intelligence</SectionTitle>
          <p className="text-sm text-slate-300">An illustrative resource model estimates service-management effort and how much supervised automation can absorb, based on clearly-stated assumptions and synthetic data. Figures are decision support, not guaranteed savings.</p>
        </CardBody></Card>
      </div>

      <Card className="mt-6"><CardBody>
        <SectionTitle>Limitations</SectionTitle>
        <ul className="space-y-1.5 text-sm text-slate-400">
          <li className="flex gap-2"><span className="text-severity-medium">›</span>Rules are heuristic and tuned for a clear demonstration, not production accuracy.</li>
          <li className="flex gap-2"><span className="text-severity-medium">›</span>All data is synthetic; correlation windows and weights would need calibration against real telemetry.</li>
          <li className="flex gap-2"><span className="text-severity-medium">›</span>User-impact and capacity figures are illustrative models with stated assumptions.</li>
          <li className="flex gap-2"><span className="text-severity-medium">›</span>Future AI extension points (summarisation, root-cause hypotheses, knowledge retrieval) are documented but intentionally not required for the core product.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">Full detail: <span className="text-teal-400">docs/orchestration-methodology.md</span>, <span className="text-teal-400">docs/responsible-ai.md</span>, <span className="text-teal-400">docs/automation-safety.md</span>.</p>
      </CardBody></Card>

      <DemoDisclaimer />
    </div>
  );
}
