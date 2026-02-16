"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { LeadCard } from "@/components/dashboard/lead-card";

interface Lead {
  id: string;
  tenant_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  intent: string | null;
  summary: string | null;
  urgency: number;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  transcript: Array<{ role: string; content: string }>;
}

const statusFilters = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
];

export default function LeadsPage() {
  const { getToken } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<
    Array<{ role: string; content: string }>
  >([]);

  const fetchLeads = useCallback(async () => {
    try {
      const token = await getToken();
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const data = await api.get<{ items: Lead[]; total_count: number }>(
        `/leads${params}`,
        { token: token || undefined }
      );
      setLeads(data.items);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      const token = await getToken();
      await api.patch<Lead>(`/leads/${leadId}`, { status }, { token: token || undefined });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      );
    } catch (err) {
      console.error("Failed to update lead:", err);
    }
  };

  const handleSelectLead = async (leadId: string) => {
    setSelectedLeadId(leadId === selectedLeadId ? null : leadId);
    setTranscript([]);

    if (leadId !== selectedLeadId) {
      // Try to find conversation via lead's extra_data
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        try {
          const token = await getToken();
          const data = await api.get<{ items: Conversation[]; total_count: number }>(
            "/conversations",
            { token: token || undefined }
          );
          const conversations = data.items;
          // Find conversation linked to this lead
          const conv = conversations.find((c) =>
            c.transcript?.some(
              (m: { role: string; content: string }) => m.role === "user"
            )
          );
          if (conv) {
            setTranscript(conv.transcript || []);
          }
        } catch {
          // Conversation not found — that's ok
        }
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} captured
          </p>
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {statusFilters.map((f) => (
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

      <div className="mt-6 flex gap-6">
        {/* Lead list */}
        <div className="flex-1 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
              <p className="text-sm text-gray-500">
                No leads yet. They&apos;ll appear here when patients chat via
                the embed widget.
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={handleStatusChange}
                onSelect={handleSelectLead}
                isSelected={selectedLeadId === lead.id}
              />
            ))
          )}
        </div>

        {/* Transcript panel */}
        {selectedLeadId && (
          <div className="w-80 shrink-0 rounded-lg border border-gray-200 bg-gray-50">
            <div className="border-b p-3">
              <h3 className="text-sm font-medium text-gray-900">
                Conversation Transcript
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
              {transcript.length > 0 ? (
                transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-2.5 text-xs ${
                      msg.role === "user"
                        ? "bg-blue-100 text-blue-900 ml-4"
                        : "bg-white text-gray-800 mr-4 border"
                    }`}
                  >
                    <span className="font-medium">
                      {msg.role === "user" ? "Patient" : "AI"}:
                    </span>{" "}
                    {msg.content}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">
                  No transcript available
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
