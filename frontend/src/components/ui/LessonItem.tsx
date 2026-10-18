import type { LessonKind } from "@/lib/types";

import { Icon, type IconProps } from "./Icon";

const KIND: Record<string, IconProps["name"]> = {
  VIDEO: "play",
  READING: "file-text",
  QUIZ: "circle-help",
  ASSIGNMENT: "clipboard-check",
  LIVE: "video",
};

export type LessonStatus = "done" | "current" | "todo" | "locked";

export interface LessonItemProps {
  title: string;
  kind: LessonKind | "LIVE";
  duration?: string;
  status?: LessonStatus;
  index?: number;
  active?: boolean;
  onClick?: () => void;
}

export function LessonItem({ title, kind, duration, status = "todo", index, active, onClick }: LessonItemProps) {
  const st = {
    done: ["var(--success)", "#fff", "check"],
    current: ["var(--accent)", "#fff", KIND[kind]],
    todo: ["var(--ink-100)", "var(--ink-600)", KIND[kind]],
    locked: ["var(--ink-50)", "var(--ink-400)", "lock"],
  }[status] as [string, string, IconProps["name"]];
  const label = kind.charAt(0) + kind.slice(1).toLowerCase();
  return (
    <div
      className={"ob-lesson" + (status === "current" || active ? " ob-lesson--current" : "") + (status === "locked" ? " ob-lesson--locked" : "")}
      onClick={status === "locked" ? undefined : onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && status !== "locked" ? 0 : undefined}
      aria-current={active ? "step" : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <span className="ob-lesson__state" style={{ background: st[0], color: st[1] }}>
        <Icon name={st[2]} size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ob-lesson__title">
          {index != null && <span style={{ color: "var(--text-subtle)", marginRight: 6 }}>{index}.</span>}
          {title}
        </div>
        <div className="ob-lesson__meta">
          {label}
          {duration && " · " + duration}
        </div>
      </div>
      {status === "current" && <span style={{ font: "600 12px var(--font-body)", color: "var(--coral-700)" }}>Up next</span>}
    </div>
  );
}
