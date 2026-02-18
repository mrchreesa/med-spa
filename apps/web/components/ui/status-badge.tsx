import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "muted" | "accent";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-spa-success/15 text-spa-success",
  warning: "bg-spa-warning/15 text-spa-warning",
  danger: "bg-spa-danger/15 text-spa-danger",
  info: "bg-spa-info/15 text-spa-info",
  muted: "bg-[var(--surface-secondary)] text-[var(--text-muted)]",
  accent: "bg-spa-accent/15 text-spa-accent",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-spa-success",
  warning: "bg-spa-warning",
  danger: "bg-spa-danger",
  info: "bg-spa-info",
  muted: "bg-[var(--text-muted)]",
  accent: "bg-spa-accent",
};

export function StatusBadge({ variant, children, className, dot }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}

// Mapping helpers
export const leadStatusVariant: Record<string, BadgeVariant> = {
  new: "info",
  contacted: "warning",
  qualified: "accent",
  booked: "success",
  lost: "muted",
};

export const escalationStatusVariant: Record<string, BadgeVariant> = {
  pending: "warning",
  in_progress: "info",
  resolved: "success",
};

export const escalationReasonVariant: Record<string, BadgeVariant> = {
  emergency: "danger",
  complaint: "warning",
  medical_question: "info",
  patient_request: "accent",
  ai_unsure: "muted",
};
