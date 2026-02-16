"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Conversation } from "@med-spa/shared";

const channelLabels: Record<string, string> = {
  web_chat: "Web Chat",
  phone: "Phone",
  sms: "SMS",
};

const channelColors: Record<string, string> = {
  web_chat: "bg-blue-100 text-blue-700",
  phone: "bg-emerald-100 text-emerald-700",
  sms: "bg-purple-100 text-purple-700",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

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
    <div className="flex h-full gap-6">
      {/* Left panel — conversation list */}
      <div className="w-96 shrink-0 flex flex-col">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="mt-1 text-sm text-gray-500">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} across all channels
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-1">
            {[
              { value: "", label: "All" },
              { value: "web_chat", label: "Web Chat" },
              { value: "phone", label: "Phone" },
              { value: "sms", label: "SMS" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setChannelFilter(f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  channelFilter === f.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
              <p className="text-sm text-gray-500">
                {search || channelFilter
                  ? "No conversations match your filters."
                  : "No conversations yet. They\u2019ll appear when patients use the chat widget."}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  selectedId === conv.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      channelColors[conv.channel] || "bg-gray-100 text-gray-700"
                    )}
                  >
                    {channelLabels[conv.channel] || conv.channel}
                  </span>
                  <span className="text-xs text-gray-400">
                    {timeAgo(conv.created_at)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-gray-700 line-clamp-2">
                  {getPreview(conv.transcript)}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {conv.transcript?.length ?? 0} message{(conv.transcript?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — transcript detail */}
      <div className="flex-1 flex flex-col rounded-lg border border-gray-200 bg-white">
        {selected ? (
          <>
            <div className="border-b px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Conversation
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      channelColors[selected.channel] || "bg-gray-100"
                    )}
                  >
                    {channelLabels[selected.channel] || selected.channel}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(selected.created_at).toLocaleString()}
                </span>
              </div>
              {selected.summary && (
                <p className="mt-1 text-sm text-gray-500">{selected.summary}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selected.transcript && selected.transcript.length > 0 ? (
                selected.transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "ml-auto bg-blue-600 text-white"
                        : "mr-auto bg-gray-100 text-gray-800"
                    )}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {msg.role === "user" ? "Patient" : "AI Concierge"}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 py-12">
                  No messages in this conversation
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Select a conversation</p>
              <p className="mt-1 text-xs text-gray-500">
                Choose a conversation from the list to view the transcript
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
