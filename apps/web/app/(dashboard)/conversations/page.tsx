"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo, formatDateTime } from "@/lib/format";
import type { Conversation } from "@med-spa/shared";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPills } from "@/components/ui/filter-pills";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Globe, Phone, MessageSquare, Search, Sparkles } from "lucide-react";

const channelFilters = [
  { value: "", label: "All" },
  { value: "web_chat", label: "Web Chat" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "SMS" },
];

const channelIcons: Record<string, typeof Globe> = {
  web_chat: Globe,
  phone: Phone,
  sms: MessageSquare,
};

const channelLabels: Record<string, string> = {
  web_chat: "Web Chat",
  phone: "Phone",
  sms: "SMS",
};

function getPreview(transcript: Array<{ role: string; content: string }>): string {
  if (!transcript || transcript.length === 0) return "No messages yet";
  const lastMsg = transcript[transcript.length - 1];
  const prefix = lastMsg.role === "user" ? "Patient: " : "AI: ";
  const content = lastMsg.content;
  return prefix + (content.length > 80 ? content.slice(0, 80) + "..." : content);
}

export default function ConversationsPage() {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.get<{ items: Conversation[]; total_count: number }>(
        "/conversations?limit=100",
        { token: token || undefined }
      );
      setConversations(data.items);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filtered = conversations.filter((c) => {
    if (channelFilter && c.channel !== channelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const inTranscript = c.transcript?.some((m) =>
        m.content.toLowerCase().includes(q)
      );
      const inSummary = c.summary?.toLowerCase().includes(q);
      return inTranscript || inSummary;
    }
    return true;
  });

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full gap-6 animate-fade-up">
      {/* Left panel */}
      <div className="w-96 shrink-0 flex flex-col">
        <PageHeader
          title="Conversations"
          subtitle={`${conversations.length} conversation${conversations.length !== 1 ? "s" : ""} across all channels`}
        />

        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-spa-accent/30 focus:border-spa-accent"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <FilterPills
            options={channelFilters}
            value={channelFilter}
            onChange={setChannelFilter}
          />
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {loading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={search || channelFilter ? "No matching conversations" : "No conversations yet"}
              description={
                search || channelFilter
                  ? "Try adjusting your filters."
                  : "They'll appear when patients use the chat widget."
              }
            />
          ) : (
            filtered.map((conv) => {
              const isActive = selectedId === conv.id;
              const ChannelIcon = channelIcons[conv.channel] || Globe;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full rounded-xl border p-3.5 text-left transition-all duration-150",
                    isActive ? "border-l-2" : "hover:shadow-sm"
                  )}
                  style={{
                    backgroundColor: isActive ? "var(--surface)" : "var(--surface)",
                    borderColor: "var(--border)",
                    ...(isActive ? { borderLeftColor: "var(--color-spa-accent)" } : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "var(--surface-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--surface)";
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <ChannelIcon className="h-3.5 w-3.5 text-spa-primary" />
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        {channelLabels[conv.channel] || conv.channel}
                      </span>
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(conv.created_at)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: "var(--text)" }}>
                    {getPreview(conv.transcript)}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {conv.transcript?.length ?? 0} message{(conv.transcript?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — transcript detail */}
      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        {selected ? (
          <>
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--text)" }}
                  >
                    Conversation
                  </h2>
                  <StatusBadge variant="info" dot>
                    {channelLabels[selected.channel] || selected.channel}
                  </StatusBadge>
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDateTime(selected.created_at)}
                </span>
              </div>
              {selected.summary && (
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--surface-secondary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {selected.summary}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selected.transcript && selected.transcript.length > 0 ? (
                selected.transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm animate-fade-up",
                      msg.role === "user" ? "ml-auto" : "mr-auto"
                    )}
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? "var(--color-spa-primary)"
                          : "var(--surface-secondary)",
                      color:
                        msg.role === "user" ? "#FFFFFF" : "var(--text)",
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    <p className="text-[11px] font-medium mb-1 flex items-center gap-1" style={{ opacity: 0.7 }}>
                      {msg.role === "user" ? (
                        "Patient"
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" /> AI Concierge
                        </>
                      )}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center py-12">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No messages in this conversation
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "var(--surface-secondary)" }}
              >
                <MessageSquare className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                Select a conversation
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Choose a conversation from the list to view the transcript
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
