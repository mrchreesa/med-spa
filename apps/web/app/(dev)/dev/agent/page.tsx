"use client";

import { useDevMetrics } from "@/hooks/use-dev-metrics";
import { devChartColors, chartPalette, tooltipStyle } from "@/lib/chart-theme";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface OverviewData {
  total_runs: number;
  avg_latency_ms: number;
  escalation_rate: number;
  p50_latency_ms: number;
}

interface AgentRun {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  total_duration_ms: number;
  node_sequence: string;
  final_node: string;
  was_escalated: boolean;
  intent_detected: string | null;
  lead_created: boolean;
  total_tokens: number;
  total_cost_usd: number;
  error: boolean;
  langfuse_trace_id: string | null;
  created_at: string;
}

interface RunsResponse {
  total: number;
  items: AgentRun[];
}

interface FlowItem {
  path: string;
  count: number;
}

interface NodePerformanceItem {
  node: string;
  calls: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
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
      <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

export default function AgentPage() {
  const { data: overview, loading } = useDevMetrics<OverviewData>("overview", { hours: "24" });
  const { data: runs } = useDevMetrics<RunsResponse>("agent/runs", { hours: "24", limit: "50" });
  const { data: flowDist } = useDevMetrics<FlowItem[]>("agent/flow-distribution", { hours: "24" });
  const { data: nodePerf } = useDevMetrics<NodePerformanceItem[]>("agent/node-performance", { hours: "24" });

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  const leadCreationRate = runs?.items?.length
    ? ((runs.items.filter((r) => r.lead_created).length / runs.items.length) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display), Georgia, serif" }}>
          Agent Quality
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Last 24 hours</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Runs" value={overview.total_runs.toLocaleString()} />
        <MetricCard label="Avg Duration" value={`${overview.avg_latency_ms.toFixed(0)}ms`} sub={`p50: ${overview.p50_latency_ms.toFixed(0)}ms`} />
        <MetricCard label="Escalation Rate" value={`${overview.escalation_rate.toFixed(1)}%`} />
        <MetricCard label="Lead Creation" value={`${leadCreationRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flow Distribution */}
        {flowDist && flowDist.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
              Flow Distribution
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={flowDist.map((f) => ({ name: f.path.split(">").pop(), value: f.count, fullPath: f.path }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {flowDist.map((_, i) => (
                    <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Node Duration */}
        {nodePerf && nodePerf.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
              Node Duration (ms)
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={nodePerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="node" width={130} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
                <Legend />
                <Bar dataKey="p50_ms" fill={devChartColors.latency} name="p50" stackId="a" />
                <Bar dataKey="p95_ms" fill={devChartColors.errors} name="p95" stackId="b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Runs Table */}
      {runs && runs.items.length > 0 && (
        <div
          className="rounded-xl p-5 overflow-x-auto"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Recent Runs ({runs.total} total)
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Time", "Duration", "Tokens", "Cost", "Path", "Escalated", "Intent", "Trace"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.items.slice(0, 20).map((run) => (
                <tr key={run.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {new Date(run.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3" style={{ color: "var(--text)" }}>{run.total_duration_ms}ms</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{run.total_tokens}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>${run.total_cost_usd.toFixed(4)}</td>
                  <td className="py-2 px-3 text-xs font-mono max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {run.node_sequence}
                  </td>
                  <td className="py-2 px-3">
                    {run.was_escalated && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(196, 91, 74, 0.15)", color: "#C45B4A" }}>
                        Yes
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {run.intent_detected || "-"}
                  </td>
                  <td className="py-2 px-3">
                    {run.langfuse_trace_id && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_LANGFUSE_HOST || ""}/trace/${run.langfuse_trace_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                        style={{ color: devChartColors.latency }}
                      >
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
