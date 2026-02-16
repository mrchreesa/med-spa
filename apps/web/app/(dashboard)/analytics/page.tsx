"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DashboardMetrics {
  period_days: number;
  total_leads: number;
  leads_today: number;
  leads_by_status: Record<string, number>;
  leads_by_source: Record<string, number>;
  total_conversations: number;
  pending_escalations: number;
  total_escalations: number;
  escalation_rate: number;
  conversion_rate: number;
}

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  booked: "Booked",
  lost: "Lost",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-emerald-500",
  booked: "bg-green-600",
  lost: "bg-gray-400",
};

const sourceLabels: Record<string, string> = {
  web_chat: "Web Chat",
  phone: "Phone",
  sms: "SMS",
};

const sourceColors: Record<string, string> = {
  web_chat: "bg-blue-500",
  phone: "bg-emerald-500",
  sms: "bg-purple-500",
};

const periodOptions = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
    </div>
  );
}

function BarChart({
  data,
  labels,
  colors,
}: {
  data: Record<string, number>;
  labels: Record<string, string>;
  colors: Record<string, string>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
    );
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      {entries.map(([key, count]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-24 text-xs text-gray-600 text-right shrink-0">
            {labels[key] || key}
          </span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", colors[key] || "bg-blue-500")}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-xs font-medium text-gray-700 text-right">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.get<DashboardMetrics>(
        `/analytics/dashboard?days=${days}`,
        { token: token || undefined }
      );
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, days]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track performance metrics and trends
          </p>
        </div>
        <div className="flex gap-1">
          {periodOptions.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                days === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : metrics ? (
        <>
          {/* Key metrics */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Total Leads"
              value={metrics.total_leads}
              subtext={`${metrics.leads_today} today`}
            />
            <MetricCard
              label="Conversations"
              value={metrics.total_conversations}
              subtext={`Last ${metrics.period_days} days`}
            />
            <MetricCard
              label="Pending Escalations"
              value={metrics.pending_escalations}
              subtext={`${metrics.total_escalations} total`}
            />
            <MetricCard
              label="Conversion Rate"
              value={`${metrics.conversion_rate}%`}
              subtext="Leads to booked"
            />
          </div>

          {/* Charts */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Leads by Status
              </h3>
              <BarChart
                data={metrics.leads_by_status}
                labels={statusLabels}
                colors={statusColors}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Leads by Source
              </h3>
              <BarChart
                data={metrics.leads_by_source}
                labels={sourceLabels}
                colors={sourceColors}
              />
            </div>
          </div>

          {/* Escalation rate */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Escalation Rate
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(metrics.escalation_rate, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 w-16 text-right">
                {metrics.escalation_rate}%
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {metrics.total_escalations} escalation{metrics.total_escalations !== 1 ? "s" : ""} out of{" "}
              {metrics.total_conversations} conversation{metrics.total_conversations !== 1 ? "s" : ""}
            </p>
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">
            Unable to load metrics. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
