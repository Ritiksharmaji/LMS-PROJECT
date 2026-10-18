import type { ReactNode } from "react";

import { Icon, type IconProps } from "./Icon";

/** Page header from the portal: overline, title, subtitle and actions on the right. */
export function PageHead({ overline, title, sub, actions }: { overline?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {overline && <div className="ob-overline" style={{ marginBottom: 6, color: "var(--text-muted)" }}>{overline}</div>}
        <h1 style={{ font: "600 28px/36px var(--font-display)", letterSpacing: "-0.02em" }}>{title}</h1>
        {sub && <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 14 }}>{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon = "book-open", title, message, action }: { icon?: IconProps["name"]; title: ReactNode; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ob-card ob-card--sunken" style={{ padding: 56, textAlign: "center" }}>
      <span className="ob-empty-icon">
        <Icon name={icon} size={28} color="var(--ink-400)" />
      </span>
      <div style={{ font: "600 17px var(--font-display)", color: "var(--text-strong)", marginTop: 12 }}>{title}</div>
      {message && <p style={{ margin: "6px auto 0", maxWidth: 420, color: "var(--text-muted)" }}>{message}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%", style }: { height?: number | string; width?: number | string; style?: React.CSSProperties }) {
  return <div className="ob-skeleton" style={{ height, width, ...style }} aria-hidden />;
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <Icon name="loader-circle" size={size} className="ob-spin" title="Loading" />;
}

/** Inline error box for failed loads, with an optional retry. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ob-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 12, borderColor: "var(--red-100)" }}>
      <Icon name="circle-alert" color="var(--danger)" />
      <span style={{ flex: 1, color: "var(--text-body)" }}>{message}</span>
      {onRetry && (
        <button type="button" className="ob-btn ob-btn--secondary ob-btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
