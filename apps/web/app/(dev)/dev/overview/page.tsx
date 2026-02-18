"use client";

import { useDevMetrics } from "@/hooks/use-dev-metrics";
import { devChartColors, tooltipStyle } from "@/lib/chart-theme";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart,
} from "recharts";

interface OverviewData {
  period_hours: number;
  total_runs: number;
  avg_latency_ms: number;
  total_tokens: number;
  total_cost_usd: number;
  error_rate: number;
  escalation_rate: number;
  avg_rag_similarity: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
}

interface LLMTimeseriesItem {
  time: string;
  calls: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
  errors: number;
}

interface NodePerformanceItem {
  node: string;
  calls: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
}

interface SystemEventItem {
  id: string;
  event_type: string;
  severity: string;
  source: string;
  message: string;
  created_at: string;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
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
      {sub && (
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTime(value: any) {
  return new Date(String(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function OverviewPage() {
  const { data: overview, loading } = useDevMetrics<OverviewData>("overview", { hours: "24" });
  const { data: timeseries } = useDevMetrics<LLMTimeseriesItem[]>("llm/timeseries", { hours: "24", interval: "hour" });
  const { data: nodePerf } = useDevMetrics<NodePerformanceItem[]>("agent/node-performance", { hours: "24" });
  const { data: events } = useDevMetrics<SystemEventItem[]>("system/events", { hours: "24", severity: "error", limit: "5" });

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display), Georgia, serif" }}>
          Dev Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Last {overview.period_hours} hours
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Runs" value={overview.total_runs.toLocaleString()} />
        <MetricCard
          label="Avg Latency"
          value={`${overview.p50_latency_ms.toFixed(0)}ms`}
          sub={`p95: ${overview.p95_latency_ms.toFixed(0)}ms`}
        />
        <MetricCard label="Total Cost" value={`$${overview.total_cost_usd.toFixed(2)}`} />
        <MetricCard label="Error Rate" value={`${overview.error_rate.toFixed(1)}%`} />
        <MetricCard label="Escalation Rate" value={`${overview.escalation_rate.toFixed(1)}%`} />
        <MetricCard label="Avg RAG Sim" value={overview.avg_rag_similarity.toFixed(3)} />
      </div>

      {/* Token Usage + Cost Timeseries */}
      {timeseries && timeseries.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Token Usage & Cost Over Time
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} labelFormatter={formatTime} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="tokens" fill={devChartColors.tokens} stroke={devChartColors.tokens} fillOpacity={0.3} name="Tokens" />
              <Line yAxisId="right" type="monotone" dataKey="cost" stroke={devChartColors.cost} strokeWidth={2} dot={false} name="Cost ($)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node Performance */}
        {nodePerf && nodePerf.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
              Node Performance
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={nodePerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="node" width={130} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
                <Legend />
                <Bar dataKey="p50_ms" fill={devChartColors.latency} name="p50 (ms)" />
                <Bar dataKey="p95_ms" fill={devChartColors.errors} name="p95 (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Errors */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Recent Errors
          </h2>
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(196, 91, 74, 0.15)", color: "#C45B4A" }}
                    >
                      {event.severity}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {event.source}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text)" }}>
                    {event.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No errors in this period</p>
          )}
        </div>
      </div>
    </div>
  );
}
