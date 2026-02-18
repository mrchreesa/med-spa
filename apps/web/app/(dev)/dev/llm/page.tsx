"use client";

import { useState } from "react";
import { useDevMetrics } from "@/hooks/use-dev-metrics";
import { devChartColors, tooltipStyle } from "@/lib/chart-theme";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface LLMTimeseriesItem {
  time: string;
  calls: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
  errors: number;
}

interface ModelBreakdown {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate: number;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTime(value: any) {
  return new Date(String(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type YAxisKey = "calls" | "tokens" | "cost" | "avg_latency_ms";

export default function LLMPage() {
  const [yAxisKey, setYAxisKey] = useState<YAxisKey>("tokens");
  const { data: timeseries, loading } = useDevMetrics<LLMTimeseriesItem[]>("llm/timeseries", { hours: "24", interval: "hour" });
  const { data: breakdown } = useDevMetrics<ModelBreakdown[]>("llm/breakdown", { hours: "24" });

  const totals = breakdown?.reduce(
    (acc, m) => ({
      calls: acc.calls + m.calls,
      tokens: acc.tokens + m.tokens,
      cost: acc.cost + m.cost,
      avgLatency: acc.avgLatency + m.avg_latency_ms * m.calls,
    }),
    { calls: 0, tokens: 0, cost: 0, avgLatency: 0 }
  );

  const avgLatency = totals && totals.calls > 0 ? totals.avgLatency / totals.calls : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  const yAxisLabels: Record<YAxisKey, string> = {
    calls: "Calls",
    tokens: "Tokens",
    cost: "Cost ($)",
    avg_latency_ms: "Latency (ms)",
  };

  const yAxisColors: Record<YAxisKey, string> = {
    calls: devChartColors.runs,
    tokens: devChartColors.tokens,
    cost: devChartColors.cost,
    avg_latency_ms: devChartColors.latency,
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display), Georgia, serif" }}>
          LLM Performance
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Last 24 hours</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Calls" value={totals?.calls.toLocaleString() ?? "0"} />
        <MetricCard label="Total Tokens" value={totals?.tokens.toLocaleString() ?? "0"} />
        <MetricCard label="Total Cost" value={`$${(totals?.cost ?? 0).toFixed(4)}`} />
        <MetricCard label="Avg Latency" value={`${avgLatency.toFixed(0)}ms`} />
      </div>

      {/* Model Breakdown Table */}
      {breakdown && breakdown.length > 0 && (
        <div
          className="rounded-xl p-5 overflow-x-auto"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Model Breakdown
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Model", "Calls", "Tokens", "Cost", "Avg Latency", "p95 Latency", "Error Rate"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.model} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-3 font-medium" style={{ color: "var(--text)" }}>{row.model}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{row.calls.toLocaleString()}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{row.tokens.toLocaleString()}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>${row.cost.toFixed(4)}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{row.avg_latency_ms.toFixed(0)}ms</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{row.p95_latency_ms.toFixed(0)}ms</td>
                  <td className="py-2 px-3" style={{ color: row.error_rate > 5 ? "#C45B4A" : "var(--text-secondary)" }}>
                    {row.error_rate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeseries */}
      {timeseries && timeseries.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              LLM Usage Over Time
            </h2>
            <select
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value as YAxisKey)}
              className="text-xs rounded-lg px-3 py-1.5"
              style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {Object.entries(yAxisLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} labelFormatter={formatTime} />
              <Area
                type="monotone"
                dataKey={yAxisKey}
                fill={yAxisColors[yAxisKey]}
                stroke={yAxisColors[yAxisKey]}
                fillOpacity={0.3}
                name={yAxisLabels[yAxisKey]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
