"use client";

import { cn } from "@/lib/utils";

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

const intentColors: Record<string, string> = {
  appointment: "bg-green-100 text-green-700",
  pricing: "bg-blue-100 text-blue-700",
  treatment_info: "bg-purple-100 text-purple-700",
  complaint: "bg-red-100 text-red-700",
  emergency: "bg-red-200 text-red-800",
  general: "bg-gray-100 text-gray-700",
};

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function LeadCard({
  lead,
  onStatusChange,
  onSelect,
  isSelected,
}: LeadCardProps) {
  return (
    <div
      onClick={() => onSelect(lead.id)}
      className={cn(
        "cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50",
        isSelected ? "border-blue-500 bg-blue-50/30" : "border-gray-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Intent badge */}
            {lead.intent && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  intentColors[lead.intent] || intentColors.general
                )}
              >
                {lead.intent.replace("_", " ")}
              </span>
            )}

            {/* Source icon */}
            <span className="text-xs text-gray-400">
              {lead.source === "web_chat"
                ? "Web Chat"
                : lead.source === "phone"
                ? "Phone"
                : "SMS"}
            </span>

            {/* Urgency dots */}
            <span className="flex gap-0.5 ml-auto">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    n <= lead.urgency ? "bg-orange-400" : "bg-gray-200"
                  )}
                />
              ))}
            </span>
          </div>

          {/* Summary */}
          <p className="mt-1.5 text-sm text-gray-900 line-clamp-2">
            {lead.summary || "No summary available"}
          </p>

          {/* Contact info if available */}
          {(lead.name || lead.phone || lead.email) && (
            <p className="mt-1 text-xs text-gray-500">
              {[lead.name, lead.phone, lead.email].filter(Boolean).join(" - ")}
            </p>
          )}
        </div>

        {/* Time + Status */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-xs text-gray-400">
            {timeAgo(lead.created_at)}
          </span>
          <select
            value={lead.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(lead.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
