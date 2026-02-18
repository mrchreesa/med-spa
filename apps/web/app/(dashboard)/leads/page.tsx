"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { LeadCard } from "@/components/dashboard/lead-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterPills } from "@/components/ui/filter-pills";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
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
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        try {
          const token = await getToken();
          const data = await api.get<{ items: Conversation[]; total_count: number }>(
            "/conversations",
            { token: token || undefined }
          );
          const conv = data.items.find((c) =>
            c.transcript?.some((m) => m.role === "user")
          );
          if (conv) {
            setTranscript(conv.transcript || []);
          }
        } catch {
          // Conversation not found
        }
      }
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.summary?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} lead${leads.length !== 1 ? "s" : ""} captured`}
        actions={
          <FilterPills
            options={statusFilters}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />

      {/* Search */}
      <div className="mb-4 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search leads by name, email, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-spa-accent/30 focus:border-spa-accent"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />
      </div>

      <div className="flex gap-6">
        {/* Lead list */}
        <div className="flex-1 space-y-2">
          {loading ? (
            <PageLoader />
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery || statusFilter ? "No matching leads" : "No leads yet"}
              description={
                searchQuery || statusFilter
                  ? "Try adjusting your filters or search query."
                  : "They'll appear here when patients chat via the embed widget."
              }
            />
          ) : (
            filteredLeads.map((lead) => (
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
          <Card className="w-80 shrink-0 p-0 animate-slide-in-right">
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Conversation Transcript
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
              {transcript.length > 0 ? (
                transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-2.5 text-xs ${
                      msg.role === "user" ? "ml-4" : "mr-4"
                    }`}
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? "var(--color-spa-primary)"
                          : "var(--surface-secondary)",
                      color:
                        msg.role === "user" ? "#FFFFFF" : "var(--text)",
                    }}
                  >
                    <span className="font-medium opacity-70">
                      {msg.role === "user" ? "Patient" : "AI"}:
                    </span>{" "}
                    {msg.content}
                  </div>
                ))
              ) : (
                <p
                  className="text-xs text-center py-8"
                  style={{ color: "var(--text-muted)" }}
                >
                  No transcript available
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
