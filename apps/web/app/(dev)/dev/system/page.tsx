"use client";

import { useDevMetrics } from "@/hooks/use-dev-metrics";
import { severityColors, tooltipStyle } from "@/lib/chart-theme";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface HealthData {
  status: string;
  database?: {
    status: string;
    latency_ms?: number;
    pool_size?: number;
    checked_in?: number;
    checked_out?: number;
    overflow?: number;
    error?: string;
  };
  redis?: {
    status: string;
    latency_ms?: number;
    error?: string;
  };
  config?: {
    openai_configured: boolean;
    clerk_configured: boolean;
    langfuse_configured: boolean;
  };
}

interface SystemEventItem {
  id: string;
  event_type: string;
  severity: string;
  source: string;
  message: string;
  stack_trace: string | null;
  extra_data: Record<string, unknown> | null;
  tenant_id: string | null;
  request_id: string | null;
  created_at: string;
}

interface ErrorTimeseriesItem {
  time: string;
  info: number;
  warning: number;
  error: number;
  critical: number;
}

function MetricCard({ label, value, status }: { label: string; value: string; status?: "ok" | "warn" | "error" }) {
  const statusColors = { ok: "#7BA68B", warn: "#D4A853", error: "#C45B4A" };
  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: status ? statusColors[status] : "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTime(value: any) {
  return new Date(String(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SystemPage() {
  const { data: health, loading } = useDevMetrics<HealthData>("../health" as any, {}, 15000);
  const { data: events } = useDevMetrics<SystemEventItem[]>("system/events", { hours: "24", limit: "50" });
  const { data: errorTs } = useDevMetrics<ErrorTimeseriesItem[]>("system/error-timeseries", { hours: "24", interval: "hour" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  const dbStatus = health?.database?.status === "connected" ? "ok" : "error";
  const redisStatus = health?.redis?.status === "connected" ? "ok" : health?.redis?.status === "unavailable" ? "warn" : "error";

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display), Georgia, serif" }}>
          System Health
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Real-time infrastructure status</p>
      </div>

      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="DB Pool"
            value={health.database?.pool_size ? `${health.database.checked_out ?? 0}/${health.database.pool_size}` : "N/A"}
            status={dbStatus as "ok" | "warn" | "error"}
          />
          <MetricCard
            label="DB Latency"
            value={health.database?.latency_ms ? `${health.database.latency_ms}ms` : "N/A"}
            status={dbStatus as "ok" | "warn" | "error"}
          />
          <MetricCard
            label="Redis"
            value={health.redis?.status ?? "unknown"}
            status={redisStatus as "ok" | "warn" | "error"}
          />
          <MetricCard
            label="Redis Latency"
            value={health.redis?.latency_ms ? `${health.redis.latency_ms}ms` : "N/A"}
            status={redisStatus as "ok" | "warn" | "error"}
          />
        </div>
      )}

      {/* Error Timeline */}
      {errorTs && errorTs.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Event Timeline
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={errorTs}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} labelFormatter={formatTime} />
              <Legend />
              <Bar dataKey="info" stackId="a" fill={severityColors.info} name="Info" />
              <Bar dataKey="warning" stackId="a" fill={severityColors.warning} name="Warning" />
              <Bar dataKey="error" stackId="a" fill={severityColors.error} name="Error" />
              <Bar dataKey="critical" stackId="a" fill={severityColors.critical} name="Critical" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events Table */}
      {events && events.length > 0 && (
        <div
          className="rounded-xl p-5 overflow-x-auto"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            System Events
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Time", "Severity", "Type", "Source", "Message"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {new Date(event.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${severityColors[event.severity] || severityColors.info}20`,
                        color: severityColors[event.severity] || severityColors.info,
                      }}
                    >
                      {event.severity}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>{event.event_type}</td>
                  <td className="py-2 px-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{event.source}</td>
                  <td className="py-2 px-3 text-xs max-w-md truncate" style={{ color: "var(--text)" }}>{event.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
