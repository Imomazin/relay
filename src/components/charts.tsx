"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const AXIS = { stroke: "#64748b", fontSize: 11 };
const GRID = "#1e293b";
const TOOLTIP_STYLE = {
  backgroundColor: "#0d1526",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

export function HorizontalBar({
  data,
  color = "#2dd4bf",
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  color?: string;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
          <XAxis type="number" {...AXIS} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={130} {...AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VerticalBar({
  data,
  color = "#38bdf8",
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  color?: string;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendArea({
  data,
  ariaLabel,
}: {
  data: { label: string; value: number; forecast?: number }[];
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={2} fill="url(#fill)" />
          <Area type="monotone" dataKey="forecast" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" fill="none" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ManualVsAutomated({
  data,
  ariaLabel,
}: {
  data: { label: string; manual: number; automated: number }[];
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <Bar dataKey="manual" stackId="a" fill="#fb923c" name="Manual" radius={[0, 0, 0, 0]} />
          <Bar dataKey="automated" stackId="a" fill="#2dd4bf" name="Automated" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricLine({
  data,
  dataKey,
  color = "#38bdf8",
  ariaLabel,
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  color?: string;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
