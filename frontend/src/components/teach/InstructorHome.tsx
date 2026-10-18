"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Icon, PageHead, ProgressBar, RelativeTime, Select, Skeleton, StatCard, Tabs, Tooltip } from "@/components/ui";
import { api } from "@/lib/api";
import { playerHref } from "@/lib/course";
import { count } from "@/lib/format";
import { useEnrollments } from "@/lib/queries";
import type { ActivityPoint, InstructorOverview, SubmissionView } from "@/lib/types";

import { CreateCourseDialog } from "./CreateCourseDialog";

function ActivityChart({ courses }: { courses: InstructorOverview["courses"] }) {
  const live = courses.filter((c) => c.status !== "DRAFT");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [range, setRange] = useState<"WEEK" | "TERM">("WEEK");
  const selected = courseId ?? live[0]?.courseId;
  const data = useQuery({
    queryKey: ["course-activity", selected, range],
    queryFn: () => api.get<ActivityPoint[]>(`/instructor/courses/${selected}/activity?range=${range}`),
    enabled: !!selected,
  });
  const title = live.find((c) => c.courseId === selected)?.title;
  const max = Math.max(1, ...(data.data ?? []).map((p) => p.activeLearners));
  return (
    <Card
      title={`Learner activity${title ? ` · ${title}` : ""}`}
      action={<Tabs variant="pill" value={range} onChange={setRange} items={[{ label: "Week", value: "WEEK" }, { label: "Term", value: "TERM" }]} />}
      padding="12px 20px 20px"
    >
      {live.length > 1 && (
        <Select size="sm" aria-label="Course" value={selected} onChange={(e) => setCourseId(e.target.value)} options={live.map((c) => ({ value: c.courseId, label: c.title }))} containerStyle={{ maxWidth: 320, marginBottom: 12 }} />
      )}
      {!selected ? (
        <p style={{ color: "var(--text-muted)" }}>Publish a course to see learner activity.</p>
      ) : !data.data ? (
        <Skeleton height={180} />
      ) : (
        <div className="flex items-end gap-[18px]" style={{ height: 180 }}>
          {data.data.map((p, i) => (
            <div key={p.start} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <Tooltip content={`${p.activeLearners} active ${p.activeLearners === 1 ? "learner" : "learners"}`}>
                <div style={{ width: 32, height: Math.max(4, (p.activeLearners / max) * 140), borderRadius: 10, background: i === data.data.length - 1 ? "var(--orbit-500)" : "var(--orbit-200)", transition: "height 360ms var(--ease-out)" }} />
              </Tooltip>
              <span style={{ font: "500 12px var(--font-body)", color: "var(--text-muted)" }}>{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function InstructorHome() {
  const [create, setCreate] = useState(false);
  const overview = useQuery({ queryKey: ["instructor-overview"], queryFn: () => api.get<InstructorOverview>("/instructor/analytics/overview") });
  const queue = useQuery({ queryKey: ["grading-queue"], queryFn: () => api.get<SubmissionView[]>("/instructor/grading-queue") });
  const learning = useEnrollments();
  if (overview.error) return <ErrorState message={overview.error.message} onRetry={() => overview.refetch()} />;
  const o = overview.data;
  const lateCount = (queue.data ?? []).filter((s) => s.late).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        overline="Instructor"
        title="Your teaching week"
        sub={o ? `${o.toGrade} ${o.toGrade === 1 ? "submission" : "submissions"} waiting · ${o.atRisk.length} ${o.atRisk.length === 1 ? "learner" : "learners"} flagged as at risk` : " "}
        actions={
          <>
            <Button variant="secondary" iconLeft="calendar-plus" href="/teach/schedule?new=1">
              Schedule live session
            </Button>
            <Button iconLeft="plus" onClick={() => setCreate(true)}>
              New course
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled learners" value={o ? count(o.enrolledLearners) : "–"} delta={o && o.newLearners90Days ? `+${o.newLearners90Days}` : undefined} hint="this term" icon="users" tone="orbit" />
        <StatCard label="Avg. completion" value={o ? `${o.averageCompletionPercent}%` : "–"} icon="target" tone="green" />
        <StatCard label="To grade" value={o ? String(o.toGrade) : "–"} icon="clipboard-check" tone="coral" hint={o?.oldestUngradedAt ? <>oldest <RelativeTime iso={o.oldestUngradedAt} /></> : "all caught up"} />
        <StatCard label="Course rating" value={o && o.reviewCount ? Number(o.rating).toFixed(1) : "—"} icon="star" tone="amber" hint={o ? `${count(o.reviewCount)} reviews` : undefined} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Courses I teach" action={o && <Badge tone="orbit">{o.courses.length}</Badge>} padding="8px 20px 16px">
          {!o ? (
            <Skeleton height={160} />
          ) : !o.courses.length ? (
            <EmptyState icon="book-plus" title="No courses yet" message="Create your first course to start teaching." action={<Button onClick={() => setCreate(true)}>Create a course</Button>} />
          ) : (
            o.courses.map((c) => (
              <Link key={c.courseId} href={`/teach/courses/${c.courseId}`} className="grid items-center gap-4 no-underline hover:no-underline sm:grid-cols-[minmax(0,1fr)_90px_150px]" style={{ padding: "12px 0", borderTop: "1px solid var(--border-subtle)", color: "inherit" }}>
                <div className="flex min-w-0 items-center gap-3">
                  <span style={{ width: 40, height: 40, flex: "none", borderRadius: 10, display: "grid", placeItems: "center", background: `var(--${c.hue}-100)`, color: `var(--${c.hue}-500)` }}>
                    <Icon name={c.icon} size={18} />
                  </span>
                  <div className="min-w-0">
                    <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {count(c.learners)} learners{c.ratingCount ? ` · ★ ${Number(c.rating).toFixed(1)}` : ""}
                    </div>
                  </div>
                </div>
                <span>
                  <Badge tone={c.status === "PUBLISHED" ? "success" : "neutral"} dot>
                    {c.status === "PUBLISHED" ? "Live" : c.status === "DRAFT" ? "Draft" : "Archived"}
                  </Badge>
                </span>
                {c.status === "DRAFT" ? <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Not published yet</span> : <ProgressBar value={c.averageProgressPercent} showValue label="Completion" />}
              </Link>
            ))
          )}
        </Card>
        <Card title="Grading queue" action={<Button variant="ghost" size="sm" iconRight="arrow-right" href="/teach/grading">Gradebook</Button>} padding="8px 12px 12px">
          {queue.isLoading && <Skeleton height={140} />}
          {queue.data?.length === 0 && <p style={{ margin: "8px 10px", color: "var(--text-muted)" }}>Nothing to grade. Nice!</p>}
          {queue.data?.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center gap-3" style={{ padding: 8 }}>
              <Avatar src={s.learnerAvatarUrl} name={s.learnerName} size={34} />
              <div className="min-w-0 flex-1">
                <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{s.learnerName}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {s.lessonTitle} · <RelativeTime iso={s.submittedAt} />
                </div>
              </div>
              {s.late && <Badge tone="danger">Late</Badge>}
              <Button size="sm" variant="secondary" href={`/teach/grading/${s.id}`}>
                Grade
              </Button>
            </div>
          ))}
          {lateCount > 0 && <div style={{ fontSize: 12, color: "var(--danger-text)", padding: "4px 8px" }}>{lateCount} submitted late</div>}
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {o ? <ActivityChart courses={o.courses} /> : <Skeleton height={260} />}
        <div className="flex flex-col gap-5">
          <Card title="At-risk learners" action={o && o.atRisk.length > 0 && <Badge tone="danger">{o.atRisk.length}</Badge>} padding="8px 20px 14px">
            {!o ? (
              <Skeleton height={100} />
            ) : !o.atRisk.length ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>Everyone is on track.</p>
            ) : (
              o.atRisk.slice(0, 5).map((r) => (
                <div key={r.userId + r.courseId} className="flex items-center gap-3" style={{ padding: "8px 0", borderTop: "1px solid var(--border-subtle)" }}>
                  <Avatar src={r.avatarUrl} name={r.fullName} size={30} />
                  <div className="min-w-0 flex-1">
                    <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{r.fullName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {r.courseTitle} · {r.progressPercent}% · active <RelativeTime iso={r.lastActiveAt} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
          <Card title="My learning" action={<Button variant="ghost" size="sm" iconRight="arrow-right" href="/learn/browse">Browse</Button>} padding="8px 20px 18px">
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Courses you’re taking from other instructors.</div>
            {(learning.data ?? []).slice(0, 4).map((e) => (
              <Link key={e.id} href={playerHref(e.course.id, e.lastLessonId)} className="flex items-center gap-3 no-underline hover:no-underline" style={{ padding: "10px 0", borderTop: "1px solid var(--border-subtle)", color: "inherit" }}>
                {e.course.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.course.coverUrl} alt="" style={{ width: 52, height: 36, flex: "none", borderRadius: 8, objectFit: "cover" }} />
                ) : (
                  <span style={{ width: 52, height: 36, borderRadius: 8, background: `var(--${e.course.hue}-100)` }} />
                )}
                <div className="min-w-0 flex-1">
                  <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{e.course.title}</div>
                  <ProgressBar value={e.progress.percent} height={6} style={{ marginTop: 6 }} />
                </div>
                <span style={{ font: "500 12px var(--font-mono)", color: "var(--text-muted)" }}>{e.progress.percent}%</span>
              </Link>
            ))}
            {learning.data?.length === 0 && (
              <Button variant="soft" href="/learn/browse">
                Find a course
              </Button>
            )}
          </Card>
        </div>
      </div>
      <CreateCourseDialog open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
