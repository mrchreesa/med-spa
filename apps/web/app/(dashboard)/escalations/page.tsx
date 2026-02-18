"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPills } from "@/components/ui/filter-pills";
import { Card } from "@/components/ui/card";
import { StatusBadge, escalationStatusVariant, escalationReasonVariant } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  HelpCircle,
  User,
  ShieldAlert,
  MessageCircleWarning,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Escalation {
  id: string;
  tenant_id: string;
  conversation_id: string;
  reason: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const reasonLabels: Record<string, string> = {
  medical_question: "Medical Question",
  complaint: "Complaint",
  emergency: "Emergency",
  ai_unsure: "AI Uncertain",
  patient_request: "Patient Requested",
};

const reasonIcons: Record<string, LucideIcon> = {
  emergency: ShieldAlert,
  complaint: MessageCircleWarning,
  medical_question: HelpCircle,
  patient_request: User,
  ai_unsure: AlertTriangle,
};

const statusFilters = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export default function EscalationsPage() {
  const { getToken } = useAuth();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchEscalations = useCallback(async () => {
    try {
      const token = await getToken();
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const data = await api.get<{ items: Escalation[]; total_count: number }>(
        `/escalations${params}`,
        { token: token || undefined }
      );
      setEscalations(data.items);
    } catch (err) {
      console.error("Failed to fetch escalations:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const handleResolve = async (escalationId: string) => {
    try {
      const token = await getToken();
      await api.patch<Escalation>(
        `/escalations/${escalationId}`,
        { status: "resolved" },
        { token: token || undefined }
      );
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === escalationId ? { ...e, status: "resolved" } : e
        )
      );
    } catch (err) {
      console.error("Failed to resolve escalation:", err);
    }
  };

  const pendingCount = escalations.filter((e) => e.status === "pending").length;

  // Group by status
  const grouped = {
    pending: escalations.filter((e) => e.status === "pending"),
    in_progress: escalations.filter((e) => e.status === "in_progress"),
    resolved: escalations.filter((e) => e.status === "resolved"),
  };

  const statusOrder = statusFilter
    ? [statusFilter]
    : ["pending", "in_progress", "resolved"];

  const statusGroupLabels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Escalations"
        subtitle="Conversations flagged for human review"
        badge={
          pendingCount > 0 ? (
            <StatusBadge variant="danger" dot>
              {pendingCount} pending
            </StatusBadge>
          ) : undefined
        }
        actions={
          <FilterPills
            options={statusFilters}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />

      {loading ? (
        <PageLoader />
      ) : escalations.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No escalations"
          description="The AI is handling conversations within scope. Escalations appear here when flagged."
        />
      ) : (
        <div className="space-y-8">
          {statusOrder.map((status) => {
            const items = grouped[status as keyof typeof grouped] || [];
            if (items.length === 0) return null;
            return (
              <div key={status}>
                <h2
                  className="text-sm font-semibold mb-3 flex items-center gap-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {statusGroupLabels[status]}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "var(--surface-secondary)", color: "var(--text-muted)" }}
                  >
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((esc) => {
                    const ReasonIcon = reasonIcons[esc.reason] || AlertTriangle;
                    return (
                      <Card key={esc.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: "var(--surface-secondary)" }}
                            >
                              <ReasonIcon
                                className={`h-4.5 w-4.5 ${
                                  esc.reason === "emergency"
                                    ? "text-spa-danger"
                                    : esc.reason === "complaint"
                                      ? "text-spa-warning"
                                      : "text-spa-info"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge variant={escalationReasonVariant[esc.reason] || "muted"}>
                                  {reasonLabels[esc.reason] || esc.reason}
                                </StatusBadge>
                                <StatusBadge variant={escalationStatusVariant[esc.status] || "muted"} dot>
                                  {statusGroupLabels[esc.status] || esc.status}
                                </StatusBadge>
                              </div>
                              {esc.notes && (
                                <p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
                                  {esc.notes}
                                </p>
                              )}
                              <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                                {timeAgo(esc.created_at)}
                              </p>
                            </div>
                          </div>

                          {esc.status !== "resolved" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResolve(esc.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-spa-success" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
