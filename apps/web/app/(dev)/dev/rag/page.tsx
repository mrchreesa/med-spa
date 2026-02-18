"use client";

import { useDevMetrics } from "@/hooks/use-dev-metrics";
import { devChartColors, tooltipStyle } from "@/lib/chart-theme";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, ComposedChart,
} from "recharts";

interface RAGQuality {
  total_retrievals: number;
  avg_similarity: number;
  zero_result_rate: number;
  avg_chunks: number;
  timeseries: Array<{
    time: string;
    avg_similarity: number;
    min_similarity: number;
    retrievals: number;
  }>;
}

interface RAGRetrieval {
  id: string;
  tenant_id: string;
  query_text: string;
  chunks_returned: number;
  chunks_above_threshold: number;
  avg_similarity: number | null;
  max_similarity: number | null;
  min_similarity: number | null;
  embedding_latency_ms: number;
  search_latency_ms: number;
  total_latency_ms: number;
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
      <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTime(value: any) {
  return new Date(String(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function RAGPage() {
  const { data: quality, loading } = useDevMetrics<RAGQuality>("rag/quality", { hours: "24" });
  const { data: retrievals } = useDevMetrics<RAGRetrieval[]>("rag/retrievals", { hours: "24", limit: "50" });

  if (loading || !quality) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  // Build similarity histogram from retrievals
  const histogramBuckets = Array.from({ length: 8 }, (_, i) => {
    const low = 0.60 + i * 0.05;
    const high = low + 0.05;
    const count = retrievals?.filter((r) =>
      r.avg_similarity !== null && r.avg_similarity >= low && r.avg_similarity < high
    ).length ?? 0;
    return { range: `${low.toFixed(2)}-${high.toFixed(2)}`, count };
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display), Georgia, serif" }}>
          RAG Quality
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Last 24 hours</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Retrievals" value={quality.total_retrievals.toLocaleString()} />
        <MetricCard label="Avg Similarity" value={quality.avg_similarity.toFixed(3)} />
        <MetricCard label="Zero-Result Rate" value={`${quality.zero_result_rate.toFixed(1)}%`} />
        <MetricCard label="Avg Chunks" value={quality.avg_chunks.toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Similarity Histogram */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Similarity Distribution
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={histogramBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} />
              <Bar dataKey="count" fill={devChartColors.similarity} name="Retrievals" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Over Time */}
        {quality.timeseries.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
              Quality Over Time
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={quality.timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis domain={[0.5, 1]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} labelFormatter={formatTime} />
                <Legend />
                <ReferenceLine y={0.78} stroke="#C45B4A" strokeDasharray="5 5" label={{ value: "Threshold", fill: "#C45B4A", fontSize: 10 }} />
                <Line type="monotone" dataKey="avg_similarity" stroke={devChartColors.similarity} strokeWidth={2} dot={false} name="Avg Similarity" />
                <Line type="monotone" dataKey="min_similarity" stroke={devChartColors.errors} strokeWidth={1} dot={false} name="Min Similarity" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Retrievals Table */}
      {retrievals && retrievals.length > 0 && (
        <div
          className="rounded-xl p-5 overflow-x-auto"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Recent Retrievals
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Time", "Query", "Chunks", "Avg Sim", "Max Sim", "Embed (ms)", "Search (ms)"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retrievals.slice(0, 20).map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {new Date(r.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3 text-xs max-w-xs truncate" style={{ color: "var(--text)" }}>
                    {r.query_text}
                  </td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{r.chunks_returned}</td>
                  <td className="py-2 px-3" style={{ color: r.avg_similarity !== null && r.avg_similarity < 0.78 ? "#C45B4A" : "var(--text-secondary)" }}>
                    {r.avg_similarity?.toFixed(3) ?? "-"}
                  </td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{r.max_similarity?.toFixed(3) ?? "-"}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{r.embedding_latency_ms}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{r.search_latency_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
