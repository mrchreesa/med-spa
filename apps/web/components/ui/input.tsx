import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          "placeholder:text-[var(--text-muted)]",
          "focus:ring-2 focus:ring-spa-accent/30 focus:border-spa-accent",
          error && "border-spa-danger focus:ring-spa-danger/30",
          className
        )}
        style={{
          backgroundColor: "var(--surface)",
          borderColor: error ? undefined : "var(--border)",
          color: "var(--text)",
        }}
        {...props}
      />
      {error && (
        <p className="text-xs text-spa-danger">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-none",
          "placeholder:text-[var(--text-muted)]",
          "focus:ring-2 focus:ring-spa-accent/30 focus:border-spa-accent",
          error && "border-spa-danger",
          className
        )}
        style={{
          backgroundColor: "var(--surface)",
          borderColor: error ? undefined : "var(--border)",
          color: "var(--text)",
        }}
        {...props}
      />
      {error && <p className="text-xs text-spa-danger">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          "focus:ring-2 focus:ring-spa-accent/30 focus:border-spa-accent",
          className
        )}
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
