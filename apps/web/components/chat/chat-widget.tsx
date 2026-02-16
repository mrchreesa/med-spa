"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  tenantId: string;
}

const SUGGESTIONS = [
  { label: "Browse treatments", icon: "\u2726" },
  { label: "Pricing & packages", icon: "\u25C8" },
  { label: "Book an appointment", icon: "\u25C7" },
  { label: "Speak with our team", icon: "\u2606" },
];

export function ChatWidget({ tenantId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const sendMessage = async (text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          tenant_id: tenantId,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to chat");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "token") {
              accumulated += event.content;
              setStreamingContent(accumulated);
            } else if (event.type === "done") {
              if (accumulated) {
                const assistantMessage: Message = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: accumulated,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingContent("");
              }
              if (event.conversation_id) {
                setConversationId(event.conversation_id);
              }
            } else if (event.type === "error") {
              if (event.conversation_id) {
                setConversationId(event.conversation_id);
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I\u2019m sorry, I\u2019m having trouble connecting right now. Please try again or contact the spa directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: "var(--spa-bg)",
        fontFamily: "var(--font-body)",
        color: "var(--spa-text)",
      }}
    >
      {/* AI Disclosure — SB 942 / EU AI Act compliance */}
      <div
        className="px-4 py-1.5 text-center"
        style={{
          background: "var(--spa-surface)",
          borderBottom: "1px solid var(--spa-border)",
        }}
      >
        <p
          className="text-[10px] tracking-wider uppercase"
          style={{ color: "var(--spa-text-muted)" }}
        >
          AI-powered assistant &middot; Not a substitute for medical advice
        </p>
      </div>

      {/* Header */}
      <div
        className="relative px-5 py-4 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--spa-primary), var(--spa-primary-dark), var(--spa-primary))",
          backgroundSize: "200% 200%",
          animation: "spa-gradient 8s ease infinite",
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"
                  fill="white"
                  opacity="0.85"
                />
              </svg>
            </div>
            {/* Online pulse */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <span
                className="absolute inline-flex h-3 w-3 rounded-full"
                style={{
                  background: "var(--spa-online)",
                  animation: "spa-pulse-ring 2s ease-out infinite",
                }}
              />
              <span
                className="relative inline-flex h-3 w-3 rounded-full border-2"
                style={{
                  background: "var(--spa-online)",
                  borderColor: "var(--spa-primary-dark)",
                }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-[17px] font-semibold leading-tight tracking-wide text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Spa Concierge
            </h2>
            <p className="mt-0.5 text-[11px] tracking-wide text-white/55">
              Your personal beauty assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome State */}
        {messages.length === 0 && !isLoading && (
          <div
            className="flex flex-col items-center justify-center h-full px-1"
            style={{ animation: "spa-fade-up 0.5s ease-out" }}
          >
            {/* Decorative icon */}
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "var(--spa-surface)",
                border: "1px solid var(--spa-border)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"
                  fill="var(--spa-accent)"
                  opacity="0.55"
                />
              </svg>
            </div>

            <h3
              className="mb-1 text-[20px] font-medium"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--spa-text)",
              }}
            >
              Welcome
            </h3>
            <p
              className="mb-6 text-[13px]"
              style={{ color: "var(--spa-text-muted)" }}
            >
              How may I assist you today?
            </p>

            {/* Quick Reply Suggestions */}
            <div className="w-full space-y-2">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={suggestion.label}
                  onClick={() => sendMessage(suggestion.label)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-[var(--spa-border)] bg-[var(--spa-surface)] px-4 py-3 text-left text-[13px] text-[var(--spa-text-secondary)] transition-all duration-300 hover:border-[var(--spa-accent)] hover:bg-[var(--spa-surface-hover)]"
                  style={{
                    animation: `spa-fade-up 0.4s ease-out ${i * 0.07}s both`,
                  }}
                >
                  <span className="text-[11px] opacity-30">
                    {suggestion.icon}
                  </span>
                  <span>{suggestion.label}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="ml-auto opacity-0 transition-opacity duration-300 group-hover:opacity-30"
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Streaming response */}
        {streamingContent && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            isStreaming={true}
          />
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div
            className="flex items-start gap-2.5"
            style={{ animation: "spa-fade-up 0.2s ease-out" }}
          >
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--spa-border)] bg-[var(--spa-surface)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"
                  fill="var(--spa-primary)"
                  opacity="0.65"
                />
              </svg>
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-[var(--spa-border)] bg-[var(--spa-surface)] px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "var(--spa-primary)",
                      animation: `spa-dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid var(--spa-border)" }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about treatments, pricing..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-[var(--spa-border)] bg-[var(--spa-surface)] px-4 py-2.5 text-[13.5px] text-[var(--spa-text)] outline-none transition-all duration-200 placeholder:text-[var(--spa-text-muted)] focus:border-[var(--spa-primary)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-body)" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200",
              input.trim() && !isLoading
                ? "bg-[var(--spa-primary)] text-white hover:opacity-90 active:scale-95"
                : "border border-[var(--spa-border)] bg-[var(--spa-surface)] text-[var(--spa-text-muted)] opacity-40 cursor-not-allowed"
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>

        {/* Disclaimer */}
        <p
          className="mt-2 text-center text-[9px] tracking-widest uppercase"
          style={{ color: "var(--spa-text-muted)", opacity: 0.5 }}
        >
          AI assistant &middot; Results may vary &middot; Consult your provider
        </p>
      </div>
    </div>
  );
}
