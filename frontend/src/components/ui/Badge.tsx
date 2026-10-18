import type { CSSProperties, HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "accent" | "orbit" | "success" | "warning" | "danger" | "info" | "dark";

const TONES: Record<BadgeTone, [string, string]> = {
  neutral: ["var(--ink-100)", "var(--ink-700)"],
  accent: ["var(--coral-100)", "var(--coral-700)"],
  orbit: ["var(--orbit-100)", "var(--orbit-700)"],
  success: ["var(--success-soft)", "var(--success-text)"],
  warning: ["var(--warning-soft)", "var(--warning-text)"],
  danger: ["var(--danger-soft)", "var(--danger-text)"],
  info: ["var(--info-soft)", "var(--info-text)"],
  dark: ["var(--ink-900)", "#fff"],
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot, children, style, ...rest }: BadgeProps) {
  const [bg, fg] = TONES[tone] ?? TONES.neutral;
  return (
    <span className="ob-badge" style={{ background: bg, color: fg, ...style } as CSSProperties} {...rest}>
      {dot && <i className="ob-badge__dot" />}
      {children}
    </span>
  );
}
