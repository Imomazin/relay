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

const AXIS = { stroke: "#8b94b8", fontSize: 11 };
const GRID = "#1e2540";
const ACCENT = "#2dd4e8";
const ACCENT_2 = "#9d93ff";
const TOOLTIP_STYLE = {
  backgroundColor: "#151a2b",
  border: "1px solid rgba(146,157,200,0.24)",
  borderRadius: 10,
  color: "#e8ebf7",
  fontSize: 12,
};

export function HorizontalBar({
  data,
  color = ACCENT,
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
  color = ACCENT,
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
              <stop offset="0%" stopColor="#2dd4e8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#2dd4e8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke="#2dd4e8" strokeWidth={2} fill="url(#fill)" />
          <Area type="monotone" dataKey="forecast" stroke="#9d93ff" strokeWidth={2} strokeDasharray="5 4" fill="none" />
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
          <Bar dataKey="manual" stackId="a" fill="#ff9a4d" name="Manual" radius={[0, 0, 0, 0]} />
          <Bar dataKey="automated" stackId="a" fill="#2dd4e8" name="Automated" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricLine({
  data,
  dataKey,
  color = ACCENT,
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
