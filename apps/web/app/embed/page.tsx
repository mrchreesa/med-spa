"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { ChatWidget } from "@/components/chat/chat-widget";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

function EmbedContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenant_id");

  if (!tenantId) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "#FAF8F5", fontFamily: "var(--font-body)" }}
      >
        <p className="text-sm" style={{ color: "#A39E9A" }}>
          Missing tenant_id parameter.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ChatWidget tenantId={tenantId} />
    </div>
  );
}

export default function EmbedPage() {
  return (
    <div className={`${cormorant.variable} ${dmSans.variable}`}>
      <style>{`
        :root {
          --spa-primary: #8B7355;
          --spa-primary-dark: #6B5842;
          --spa-accent: #C9A96E;
          --spa-bg: #FAF8F5;
          --spa-surface: #F3EDE7;
          --spa-surface-hover: #EDE5DC;
          --spa-text: #2D2926;
          --spa-text-secondary: #6B6462;
          --spa-text-muted: #A39E9A;
          --spa-border: #E8E2DB;
          --spa-online: #7BA68B;
        }

        @keyframes spa-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes spa-fade-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spa-dot-bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.3;
          }
          40% {
            transform: scale(1);
            opacity: 0.8;
          }
        }

        @keyframes spa-pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2); opacity: 0; }
        }

        @keyframes spa-cursor-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.6; }
        }

        /* Scrollbar styling for the chat area */
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--spa-border);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--spa-text-muted);
        }
      `}</style>

      <Suspense
        fallback={
          <div
            className="flex h-screen items-center justify-center"
            style={{ background: "#FAF8F5" }}
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: "#8B7355",
                    animation: `spa-dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        }
      >
        <EmbedContent />
      </Suspense>
    </div>
  );
}
