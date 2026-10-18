import type { CSSProperties, ReactNode } from "react";

import { Card } from "./Card";
import { Icon, type IconProps } from "./Icon";

const TONES = {
  coral: ["var(--coral-100)", "var(--coral-600)"],
  orbit: ["var(--orbit-100)", "var(--orbit-600)"],
  green: ["var(--green-100)", "var(--green-700)"],
  amber: ["var(--amber-100)", "var(--amber-700)"],
  sky: ["var(--sky-100)", "var(--sky-700)"],
  ink: ["var(--ink-100)", "var(--ink-800)"],
} as const;

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  trend?: "up" | "down";
  icon?: IconProps["name"];
  tone?: keyof typeof TONES;
  hint?: ReactNode;
  style?: CSSProperties;
}

export function StatCard({ label, value, delta, trend = "up", icon, tone = "coral", hint, style }: StatCardProps) {
  const t = TONES[tone];
  return (
    <Card padding={0} style={style}>
      <div className="ob-stat">
        <div className="ob-stat__top">
          <span className="ob-stat__label">{label}</span>
          {icon && (
            <span className="ob-stat__icon" style={{ background: t[0], color: t[1] }}>
              <Icon name={icon} size={18} />
            </span>
          )}
        </div>
        <div className="ob-stat__value">{value}</div>
        {(delta || hint) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {delta && (
              <span className="ob-stat__delta" style={{ color: trend === "up" ? "var(--success-text)" : "var(--danger-text)" }}>
                <Icon name={trend === "up" ? "trending-up" : "trending-down"} size={14} />
                {delta}
              </span>
            )}
            {hint && <span style={{ font: "400 12px var(--font-body)", color: "var(--text-muted)" }}>{hint}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
