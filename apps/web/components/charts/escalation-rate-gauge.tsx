"use client";

interface EscalationRateGaugeProps {
  rate: number;
  totalEscalations: number;
  totalConversations: number;
}

export function EscalationRateGauge({
  rate,
  totalEscalations,
  totalConversations,
}: EscalationRateGaugeProps) {
  const clampedRate = Math.min(rate, 100);
  const color =
    clampedRate <= 10
      ? "var(--color-spa-success)"
      : clampedRate <= 25
        ? "var(--color-spa-warning)"
        : "var(--color-spa-danger)";

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <span
            className="text-3xl font-semibold"
            style={{ color, fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {rate}%
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {totalEscalations} of {totalConversations} conversations
        </span>
      </div>
      <div
        className="h-2.5 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--surface-secondary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${clampedRate}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {clampedRate <= 10
          ? "Excellent — most conversations handled by AI"
          : clampedRate <= 25
            ? "Normal range — some conversations need staff"
            : "High — review escalation triggers"}
      </p>
    </div>
  );
}
