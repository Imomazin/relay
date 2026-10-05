import { getCapacity, getAnalytics } from "@/lib/queries";
import { Card, CardBody, PageHeader, SectionTitle, StatTile, DemoDisclaimer, Chip } from "@/components/ui";
import { TrendArea, ManualVsAutomated, HorizontalBar, VerticalBar } from "@/components/charts";
import { computeResourceModel } from "@/lib/engines/capacity";
import { formatDateTime, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Capacity" };

export default async function CapacityPage() {
  const { forecasts, scenarios, topEffort } = await getCapacity();
  const analytics = await getAnalytics();

  const workloadTrend = forecasts.map((f) => ({
    label: f.periodLabel.replace("Forecast ", "F").replace("Week ", "W"),
    value: f.isForecast ? (undefined as unknown as number) : f.supportWorkloadHours,
    forecast: f.isForecast ? f.supportWorkloadHours : (undefined as unknown as number),
  }));
  const handlingMix = forecasts.map((f) => ({
    label: f.periodLabel.replace("Forecast ", "F").replace("Week ", "W"),
    manual: f.manualHandled,
    automated: f.automatedHandled,
  }));

  const baseline = scenarios.find((s) => s.isBaseline) ?? scenarios[0];
  const baselineModel = baseline ? computeResourceModel(baseline) : null;

  const latestActual = [...forecasts].reverse().find((f) => !f.isForecast);
  const nextForecast = forecasts.find((f) => f.isForecast);
  const peak = forecasts.reduce((m, f) => (f.eventCount > m.eventCount ? f : m), forecasts[0]);

  return (
    <div>
      <PageHeader
        title="Capacity Intelligence"
        description="How service-management effort scales with operational complexity — and how much supervised automation can absorb. All figures are illustrative and based on synthetic data."
      />

      {baselineModel ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Baseline manual workload" value={`${baselineModel.baselineFullyManualHours}h`} sub="if fully manual" />
          <StatTile label="With automation" value={`${baselineModel.totalWorkloadHours}h`} tone="good" sub="modelled total" />
          <StatTile label="Potential hours avoided" value={`${baselineModel.potentialHoursAvoided}h`} tone="good" sub="illustrative" />
          <StatTile label="Capacity utilisation" value={`${baselineModel.capacityUtilisationPct}%`} sub="of support capacity" />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle hint="actual (teal) vs forecast (purple, dashed)">Support workload over time</SectionTitle>
          <Card><CardBody><TrendArea data={workloadTrend} ariaLabel="Support workload hours per week, actual and forecast" /></CardBody></Card>
        </div>
        <div>
          <SectionTitle hint="incidents handled">Manual vs automated handling</SectionTitle>
          <Card><CardBody><ManualVsAutomated data={handlingMix} ariaLabel="Manual versus automated incident handling per week" /></CardBody></Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Services generating greatest effort</SectionTitle>
          <Card><CardBody><HorizontalBar data={topEffort.map((t) => ({ label: t.service, value: t.count }))} color="#fb923c" ariaLabel="Incident effort by service" /></CardBody></Card>
        </div>
        <div className="space-y-3">
          <StatTile label="Latest weekly workload" value={`${latestActual?.supportWorkloadHours ?? 0}h`} />
          <StatTile label="Forecast next period" value={`${nextForecast?.supportWorkloadHours ?? 0}h`} tone="warn" />
          <StatTile label="Peak event week" value={peak ? formatDateTime(peak.periodStart).split(",")[0] : "—"} sub={`${peak?.eventCount ?? 0} events`} />
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle hint="illustrative resource model">Resource scenarios</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((s) => {
            const model = computeResourceModel(s);
            return (
              <Card key={s.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">{s.name}</h3>
                    {s.isBaseline ? <Chip className="text-teal-400">baseline</Chip> : null}
                  </div>
                  <p className="text-sm text-slate-400">{s.description}</p>
                  <div className="space-y-1.5 text-sm">
                    <Row label="Incidents / period" value={`${s.incidentCount}`} />
                    <Row label="Automatable" value={`${s.automatedHandlingPct}%`} />
                    <Row label="Automated incidents" value={`${model.automatedIncidentCount}`} />
                    <Row label="Manual workload" value={`${model.estimatedManualWorkloadHours}h`} />
                    <Row label="Automated workload" value={`${model.estimatedAutomatedWorkloadHours}h`} />
                    <Row label="Total workload" value={`${model.totalWorkloadHours}h`} highlight />
                    <Row label="Hours avoided" value={`${model.potentialHoursAvoided}h`} good />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
        {baselineModel ? (
          <Card className="mt-4"><CardBody>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Model assumptions</p>
            <ul className="grid gap-1 text-sm text-slate-400 sm:grid-cols-2">
              {baselineModel.assumptions.map((a, i) => <li key={i} className="flex gap-2"><span className="text-teal-500">›</span>{a}</li>)}
            </ul>
          </CardBody></Card>
        ) : null}
      </div>

      <div className="mt-8">
        <SectionTitle>Analytics</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardBody>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Incident volume by service</p>
            <HorizontalBar data={analytics.incidentsByService} color="#2dd4bf" ariaLabel="Incident volume by service" />
          </CardBody></Card>
          <Card><CardBody>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Events by source</p>
            <HorizontalBar data={analytics.eventsBySource.map((d) => ({ label: titleCase(d.label), value: d.value }))} color="#38bdf8" ariaLabel="Events by source" />
          </CardBody></Card>
          <Card><CardBody>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recurring incident categories</p>
            <VerticalBar data={analytics.incidentsByCategory.map((d) => ({ label: titleCase(d.label), value: d.value }))} color="#a78bfa" ariaLabel="Recurring incident categories" />
          </CardBody></Card>
          <Card><CardBody>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Incidents by severity</p>
            <VerticalBar data={analytics.incidentsBySeverity.map((d) => ({ label: titleCase(d.label), value: d.value }))} color="#fb923c" ariaLabel="Incidents by severity" />
          </CardBody></Card>
        </div>
      </div>

      <DemoDisclaimer />
    </div>
  );
}

function Row({ label, value, highlight, good }: { label: string; value: string; highlight?: boolean; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right ${highlight ? "font-semibold text-white" : good ? "text-status-healthy" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}
