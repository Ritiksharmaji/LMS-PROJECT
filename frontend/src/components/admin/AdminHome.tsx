"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card, ErrorState, Icon, PageHead, RelativeTime, Skeleton, StatCard, Tabs, Tooltip, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { count } from "@/lib/format";
import { useMe } from "@/lib/queries";
import type { AdminOverview } from "@/lib/types";

type Range = AdminOverview["range"];

const ACTIVITY: Record<string, [IconName, string]> = {
  MEMBER_JOINED: ["user-plus", "sky"],
  COURSE_PUBLISHED: ["book-open", "orbit"],
  COURSE_COMPLETED: ["award", "green"],
  ORDER_PAID: ["receipt", "green"],
  ENROLLED: ["graduation-cap", "coral"],
  SEAT_ALERT: ["triangle-alert", "amber"],
};

function delta(d: number | null, suffix = "%") {
  if (d == null || d === 0) return { delta: undefined, trend: "up" as const };
  return { delta: `${d > 0 ? "+" : ""}${d}${suffix}`, trend: d > 0 ? ("up" as const) : ("down" as const) };
}

export function AdminHome() {
  const me = useMe();
  const [range, setRange] = useState<Range>("MONTHS_6");
  const o = useQuery({ queryKey: ["admin-overview", range], queryFn: () => api.get<AdminOverview>(`/admin/analytics/overview?range=${range}`) });
  if (o.error) return <ErrorState message={o.error.message} onRetry={() => o.refetch()} />;
  const d = o.data;
  const max = Math.max(1, ...(d?.series ?? []).flatMap((p) => [p.enrollments, p.completions]));
  const active = delta(d?.activeLearners.delta ?? null);
  const completion = delta(d?.completionRatePercent.delta ?? null, " pts");
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        overline={me.data?.organization.name}
        title="Platform analytics"
        actions={
          <>
            <Tabs variant="pill" value={range} onChange={setRange} items={[{ label: "30 days", value: "DAYS_30" }, { label: "6 months", value: "MONTHS_6" }, { label: "Year", value: "YEAR" }]} />
            {/* A plain link: the CSV comes from the API, not a page route. */}
            <a className="ob-btn ob-btn--dark ob-btn--md no-underline hover:no-underline" href="/api/backend/admin/analytics/report.csv" download>
              <Icon name="download" size={18} />
              Report
            </a>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active learners" value={d ? count(d.activeLearners.value) : "–"} {...active} hint="vs previous period" icon="users" tone="ink" />
        <StatCard label="Courses live" value={d ? count(d.coursesLive.value) : "–"} delta={d && d.coursesLive.delta ? `+${d.coursesLive.delta}` : undefined} hint="published in period" icon="library" tone="orbit" />
        <StatCard label="Completion rate" value={d ? `${Math.round(d.completionRatePercent.value)}%` : "–"} {...completion} icon="target" tone="green" />
        <StatCard
          label="Seats used"
          value={d ? (d.seats.percent != null ? `${d.seats.percent}%` : count(d.seats.used)) : "–"}
          icon="armchair"
          tone="amber"
          hint={d ? (d.seats.limit ? `${count(d.seats.used)} / ${count(d.seats.limit)}` : "No seat limit") : undefined}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card
          title="Enrollments vs completions"
          action={
            <div className="flex gap-3.5" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ink-900)" }} />
                Enrolled
              </span>
              <span className="flex items-center gap-1.5">
                <i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--coral-500)" }} />
                Completed
              </span>
            </div>
          }
        >
          {!d ? (
            <Skeleton height={240} />
          ) : (
            <div className="flex items-end gap-[22px] overflow-x-auto" style={{ height: 240 }}>
              {d.series.map((p, i) => (
                <div key={p.start} className="flex h-full min-w-[36px] flex-1 flex-col items-center justify-end gap-2">
                  <Tooltip content={`${p.enrollments} enrolled · ${p.completions} completed`}>
                    <div className="flex items-end gap-[5px]">
                      <div className="ob-bar" style={{ animationDelay: `${i * 70}ms`, width: 18, height: Math.max(3, (p.enrollments / max) * 190), borderRadius: 6, background: "var(--ink-900)", transition: "height 360ms var(--ease-out)" }} />
                      <div className="ob-bar" style={{ animationDelay: `${i * 70 + 120}ms`, width: 18, height: Math.max(3, (p.completions / max) * 190), borderRadius: 6, background: "var(--coral-500)", transition: "height 360ms var(--ease-out)" }} />
                    </div>
                  </Tooltip>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{p.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Recent activity" padding="8px 12px 12px">
          {!d ? (
            <Skeleton height={240} />
          ) : !d.recentActivity.length ? (
            <p style={{ margin: "8px", color: "var(--text-muted)" }}>Nothing yet.</p>
          ) : (
            d.recentActivity.map((a, i) => {
              const [ic, h] = ACTIVITY[a.kind] ?? ["activity", "ink"];
              return (
                <div key={i} className="flex items-start gap-3" style={{ padding: 8 }}>
                  <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, display: "grid", placeItems: "center", background: `var(--${h}-100)`, color: h === "ink" ? "var(--ink-800)" : `var(--${h}-700)` }}>
                    <Icon name={ic} size={16} />
                  </span>
                  <div>
                    <div style={{ font: "500 14px/20px var(--font-body)", color: "var(--text-strong)" }}>{a.text}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      <RelativeTime iso={a.at} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
