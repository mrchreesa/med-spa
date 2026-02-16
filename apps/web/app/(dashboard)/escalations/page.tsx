"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

const reasonColors: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  complaint: "bg-orange-100 text-orange-700",
  medical_question: "bg-yellow-100 text-yellow-700",
  patient_request: "bg-blue-100 text-blue-700",
  ai_unsure: "bg-gray-100 text-gray-700",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
};

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Escalations
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Conversations flagged for human review
          </p>
        </div>

        <div className="flex gap-1">
          {[
            { value: "", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In Progress" },
            { value: "resolved", label: "Resolved" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : escalations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <p className="text-sm text-gray-500">
              No escalations. The AI is handling conversations within scope.
            </p>
          </div>
        ) : (
          escalations.map((esc) => (
            <div
              key={esc.id}
              className={cn(
                "rounded-lg border p-4",
                statusColors[esc.status] || "border-gray-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        reasonColors[esc.reason] || reasonColors.ai_unsure
                      )}
                    >
                      {reasonLabels[esc.reason] || esc.reason}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {esc.status.replace("_", " ")}
                    </span>
                  </div>
                  {esc.notes && (
                    <p className="mt-2 text-sm text-gray-700">{esc.notes}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(esc.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {esc.status !== "resolved" && (
                    <button
                      onClick={() => handleResolve(esc.id)}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
