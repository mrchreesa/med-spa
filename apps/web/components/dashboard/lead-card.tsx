"use client";

import { cn } from "@/lib/utils";
import { timeAgo, capitalize } from "@/lib/format";
import { StatusBadge, leadStatusVariant } from "@/components/ui/status-badge";
import { Globe, Phone, MessageSquare } from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  intent: string | null;
  summary: string | null;
  urgency: number;
  created_at: string;
}

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: string) => void;
  onSelect: (leadId: string) => void;
  isSelected: boolean;
}

const intentVariant: Record<string, "success" | "info" | "accent" | "danger" | "warning" | "muted"> = {
  appointment: "success",
  pricing: "info",
  treatment_info: "accent",
  complaint: "danger",
  emergency: "danger",
  general: "muted",
};

const sourceIcons: Record<string, typeof Globe> = {
  web_chat: Globe,
  phone: Phone,
  sms: MessageSquare,
};

const sourceLabels: Record<string, string> = {
  web_chat: "Web",
  phone: "Phone",
  sms: "SMS",
};

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function LeadCard({
  lead,
  onStatusChange,
  onSelect,
  isSelected,
}: LeadCardProps) {
  const SourceIcon = sourceIcons[lead.source] || Globe;

  return (
    <div
      onClick={() => onSelect(lead.id)}
      className={cn(
        "cursor-pointer rounded-xl border p-4 transition-all duration-150",
        isSelected
          ? "border-l-2 border-l-spa-accent"
          : "hover:shadow-sm"
      )}
      style={{
        backgroundColor: isSelected ? "var(--surface)" : "var(--surface)",
        borderColor: isSelected ? "var(--border)" : "var(--border)",
        ...(isSelected ? { borderLeftColor: "var(--color-spa-accent)" } : {}),
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = "var(--surface-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface)";
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ backgroundColor: "var(--surface-secondary)", color: "var(--text-secondary)" }}
        >
          {getInitials(lead.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {lead.intent && (
              <StatusBadge variant={intentVariant[lead.intent] || "muted"}>
                {capitalize(lead.intent)}
              </StatusBadge>
            )}
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <SourceIcon className="h-3 w-3" />
              {sourceLabels[lead.source] || lead.source}
            </span>

            {/* Urgency dots */}
            <span className="flex gap-0.5 ml-auto">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    n <= lead.urgency ? "bg-spa-warning" : ""
                  )}
                  style={n > lead.urgency ? { backgroundColor: "var(--border)" } : undefined}
                />
              ))}
            </span>
          </div>

          <p className="mt-1.5 text-sm line-clamp-2" style={{ color: "var(--text)" }}>
            {lead.summary || "No summary available"}
          </p>

          {(lead.name || lead.phone || lead.email) && (
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {[lead.name, lead.phone, lead.email].filter(Boolean).join(" \u00B7 ")}
            </p>
          )}
        </div>

        {/* Time + Status */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {timeAgo(lead.created_at)}
          </span>
          <select
            value={lead.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(lead.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-spa-accent/30"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
