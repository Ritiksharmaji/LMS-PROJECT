import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { Avatar } from "./Avatar";
import { Card } from "./Card";
import { Icon, type IconProps } from "./Icon";
import { ProgressBar } from "./Progress";

export const HUES = {
  coral: ["var(--coral-100)", "var(--coral-500)"],
  orbit: ["var(--orbit-100)", "var(--orbit-500)"],
  green: ["var(--green-100)", "var(--green-500)"],
  amber: ["var(--amber-100)", "var(--amber-500)"],
  sky: ["var(--sky-100)", "var(--sky-500)"],
  ink: ["var(--ink-100)", "var(--ink-700)"],
} as const;

export type HueName = keyof typeof HUES;

export function hue(name: string | null | undefined): readonly [string, string] {
  return HUES[(name ?? "coral") as HueName] ?? HUES.coral;
}

export interface CourseCardProps {
  title: string;
  category?: string | null;
  instructor?: string | null;
  lessons?: number;
  duration?: string;
  level?: string;
  rating?: number | null;
  reviews?: number;
  /** Already formatted ("Free", "$49.99"). */
  price?: string | null;
  progress?: number | null;
  cover?: string | null;
  icon?: IconProps["name"];
  hue?: string;
  badge?: ReactNode;
  action?: ReactNode;
  href?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function CourseCard({
  title, category, instructor, lessons, duration, level, rating, reviews, price, progress, cover, icon = "book-open",
  hue: hueName = "coral", badge, action, href, onClick, style,
}: CourseCardProps) {
  const [bg, fg] = hue(hueName);
  const body = (
    <Card interactive padding={0} className="ob-course h-full" onClick={onClick} style={style}>
      <div className="ob-course__cover" style={{ background: bg, color: fg }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary storage hosts */}
        {cover ? <img src={cover} alt="" /> : <Icon name={icon} size={44} />}
        {badge && <span style={{ position: "absolute", top: 12, left: 12 }}>{badge}</span>}
        {action && (
          <span style={{ position: "absolute", top: 10, right: 10 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            {action}
          </span>
        )}
      </div>
      <div className="ob-course__body" style={{ flex: 1 }}>
        {category && (
          <div style={{ font: "600 11px/16px var(--font-body)", letterSpacing: ".08em", textTransform: "uppercase", color: fg === "var(--ink-700)" ? fg : fg.replace("-500", "-700") }}>
            {category}
          </div>
        )}
        <div className="ob-course__title">{title}</div>
        {rating != null && rating > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, font: "600 13px var(--font-body)", color: "var(--text-strong)" }}>
            <Icon name="star" size={14} color="var(--amber-500)" style={{ fill: "var(--amber-500)" }} />
            {rating.toFixed(1)}
            {reviews != null && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({reviews.toLocaleString("en-US")})</span>}
          </div>
        )}
        <div className="ob-course__meta">
          {lessons != null && (
            <span>
              <Icon name="circle-play" size={14} />
              {lessons} lessons
            </span>
          )}
          {duration && (
            <span>
              <Icon name="clock" size={14} />
              {duration}
            </span>
          )}
          {level && (
            <span>
              <Icon name="signal" size={14} />
              {level}
            </span>
          )}
        </div>
        {progress != null && (
          <ProgressBar value={progress} showValue label={progress >= 100 ? "Completed" : "Progress"} color={progress >= 100 ? "var(--success)" : undefined} />
        )}
        <div style={{ flex: 1 }} />
        {(instructor || price) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-subtle)", font: "500 13px var(--font-body)", color: "var(--text-body)" }}>
            {instructor && (
              <>
                <Avatar name={instructor} size={24} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{instructor}</span>
              </>
            )}
            {price && (
              <span style={{ marginLeft: "auto", font: "600 15px var(--font-display)", color: price === "Free" ? "var(--success-text)" : "var(--text-strong)" }}>
                {price}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full no-underline hover:no-underline" style={{ color: "inherit" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
