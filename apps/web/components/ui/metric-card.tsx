import { cn } from "@/lib/utils";
import { Card } from "./card";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {title}
          </p>
          <p className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-spa-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-spa-danger" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositive ? "text-spa-success" : "text-spa-danger"
                )}
              >
                {isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--surface-secondary)" }}
        >
          <Icon className="h-5 w-5 text-spa-accent" />
        </div>
      </div>
    </Card>
  );
}
