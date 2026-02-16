"use client";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex w-full gap-2.5", isUser ? "justify-end" : "justify-start")}
      style={{ animation: "spa-fade-up 0.3s ease-out both" }}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--spa-border)] bg-[var(--spa-surface)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"
              fill="var(--spa-primary)"
              opacity="0.65"
            />
          </svg>
        </div>
      )}

      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-[13.5px] leading-[1.65]",
          isUser
            ? "rounded-br-sm bg-[var(--spa-primary)] text-white"
            : "rounded-bl-sm border border-[var(--spa-border)] bg-[var(--spa-surface)] text-[var(--spa-text)]"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {isStreaming && (
          <span
            className="ml-0.5 inline-block align-middle rounded-full"
            style={{
              width: 2.5,
              height: 14,
              background: "var(--spa-primary)",
              opacity: 0.45,
              animation: "spa-cursor-blink 0.8s ease-in-out infinite",
            }}
          />
        )}
        {timestamp && (
          <p
            className={cn(
              "mt-1.5 text-[10px] tracking-wide",
              isUser ? "text-white/40" : "text-[var(--spa-text-muted)]"
            )}
          >
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
