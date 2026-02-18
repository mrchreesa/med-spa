"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { Users, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { FilterPills } from "@/components/ui/filter-pills";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadsByStatusChart } from "@/components/charts/leads-by-status-chart";
import { LeadsBySourceChart } from "@/components/charts/leads-by-source-chart";
import { EscalationRateGauge } from "@/components/charts/escalation-rate-gauge";
import { BarChart3 } from "lucide-react";

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

const periodOptions = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

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
    <div className="animate-fade-up">
      <PageHeader
        title="Analytics"
        subtitle="Track performance metrics and trends"
        actions={
          <FilterPills
            options={periodOptions}
            value={days}
            onChange={setDays}
          />
        }
      />

      {loading ? (
        <PageLoader />
      ) : metrics ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              title="Total Leads"
              value={metrics.total_leads}
              icon={Users}
              trend={{ value: metrics.leads_today, label: "today" }}
            />
            <MetricCard
              title="Conversations"
              value={metrics.total_conversations}
              icon={MessageSquare}
            />
            <MetricCard
              title="Pending Escalations"
              value={metrics.pending_escalations}
              icon={AlertTriangle}
            />
            <MetricCard
              title="Conversion Rate"
              value={`${metrics.conversion_rate}%`}
              icon={TrendingUp}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
              </CardHeader>
              <LeadsByStatusChart data={metrics.leads_by_status} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leads by Source</CardTitle>
              </CardHeader>
              <LeadsBySourceChart data={metrics.leads_by_source} />
            </Card>
          </div>

          {/* Escalation Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Escalation Rate</CardTitle>
            </CardHeader>
            <EscalationRateGauge
              rate={metrics.escalation_rate}
              totalEscalations={metrics.total_escalations}
              totalConversations={metrics.total_conversations}
            />
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Unable to load metrics"
          description="Please check your connection and try again."
          action={{ label: "Retry", onClick: fetchMetrics }}
        />
      )}
    </div>
  );
}
