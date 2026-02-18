"use client";

import { useDevMetrics } from "@/hooks/use-dev-metrics";
import { devChartColors, chartPalette, tooltipStyle } from "@/lib/chart-theme";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface EscalationAnalysis {
  total_decisions: number;
  regex_triggers: number;
  llm_triggers: number;
  method_breakdown: Array<{ method: string; total: number; escalated: number }>;
  reason_distribution: Array<{ reason: string; count: number }>;
  pattern_distribution: Array<{ pattern: string; count: number }>;
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
      <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

export default function EscalationsPage() {
  const { data, loading } = useDevMetrics<EscalationAnalysis>("escalations/analysis", { hours: "24" });

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  const methodPieData = data.method_breakdown.map((m) => ({
    name: m.method === "regex" ? "Regex" : "LLM",
    value: m.escalated,
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display), Georgia, serif" }}>
          Escalation Analysis
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Last 24 hours</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Decisions" value={data.total_decisions.toLocaleString()} />
        <MetricCard label="Regex Triggers" value={data.regex_triggers.toLocaleString()} />
        <MetricCard label="LLM Triggers" value={data.llm_triggers.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection Method Pie */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Detection Method
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={methodPieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={devChartColors.regex} />
                <Cell fill={devChartColors.llm} />
              </Pie>
              <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Reason Distribution */}
        {data.reason_distribution.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
              Escalation Reasons
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.reason_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
                <Bar dataKey="count" fill={devChartColors.errors} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pattern Distribution */}
        {data.pattern_distribution.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
              Pattern Matches
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.pattern_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="pattern" width={120} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
                <Bar dataKey="count" fill={devChartColors.latency} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
