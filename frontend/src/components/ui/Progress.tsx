import type { CSSProperties, ReactNode } from "react";

export interface ProgressBarProps {
  value?: number;
  max?: number;
  label?: ReactNode;
  showValue?: boolean;
  color?: string;
  height?: number;
  style?: CSSProperties;
}

export function ProgressBar({ value = 0, max = 100, label, showValue, color = "var(--accent)", height = 8, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="ob-progress" style={style}>
      <div className="ob-progress__track" style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="ob-progress__fill" style={{ width: pct + "%", background: color }} />
      </div>
      {(label || showValue) && (
        <div className="ob-progress__meta">
          <span>{label}</span>
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
    </div>
  );
}

export interface ProgressRingProps {
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}

export function ProgressRing({ value = 0, size = 56, stroke = 6, color = "var(--accent)", track = "var(--ink-100)", children }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, value) / 100);
  return (
    <span style={{ position: "relative", display: "inline-grid", placeItems: "center", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="ob-ring-fill"
          style={{ transition: "stroke-dashoffset var(--dur-slow) var(--ease-out)", ["--ring-c" as string]: c }}
        />
      </svg>
      <span style={{ position: "relative", font: `600 ${Math.round(size * 0.24)}px var(--font-display)`, color: "var(--text-strong)", letterSpacing: "-0.02em" }}>
        {children ?? Math.round(value) + "%"}
      </span>
    </span>
  );
}
