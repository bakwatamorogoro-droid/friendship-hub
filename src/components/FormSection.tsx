import type { LucideIcon } from "lucide-react";

/**
 * Kipande cha fomu kinachojitenga: namba, kichwa na maelezo mafupi.
 * Hubadilisha muonekano tu (nafasi, mipaka, mpangilio) — rangi zinatoka kwa theme.
 */
export function FormSection({
  step,
  title,
  hint,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <header className="form-section-head">
        <span className="form-section-step" aria-hidden>
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="form-section-title">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
            {title}
          </h2>
          {hint && <p className="form-section-hint">{hint}</p>}
        </div>
      </header>
      <div className="form-section-body">{children}</div>
    </section>
  );
}
