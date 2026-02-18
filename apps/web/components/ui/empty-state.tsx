import { type LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
        style={{ backgroundColor: "var(--surface-secondary)" }}
      >
        <Icon className="h-7 w-7" style={{ color: "var(--text-muted)" }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs mb-4" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
