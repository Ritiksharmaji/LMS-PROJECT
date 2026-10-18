"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { CourseGrid } from "@/components/public/CourseGrid";
import { Badge, Button, Card, CourseCard, EmptyState, ErrorState, Icon, PageHead, ProgressRing, Skeleton, StatCard, useNow } from "@/components/ui";
import { api } from "@/lib/api";
import { cardProps, playerHref } from "@/lib/course";
import { due, greeting, time } from "@/lib/format";
import { useEnrollments, useMe } from "@/lib/queries";
import type { CourseCard as Course, Deadline, LearningSummary, MyGrade, Page, PlayerView, SessionView } from "@/lib/types";

function letter(pct: number) {
  return pct >= 93 ? "A" : pct >= 90 ? "A-" : pct >= 87 ? "B+" : pct >= 83 ? "B" : pct >= 80 ? "B-" : pct >= 77 ? "C+" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
}

function todayRange(now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return `from=${start.toISOString()}&to=${end.toISOString()}`;
}

function ContinueHero({ summary }: { summary: LearningSummary }) {
  const current = summary.continueLearning[0];
  const player = useQuery({
    queryKey: ["player", current?.course.id],
    queryFn: () => api.get<PlayerView>(`/me/courses/${current!.course.id}/player`),
    enabled: !!current,
  });
  if (!current) {
    return (
      <Card padding={28}>
        <div style={{ font: "600 20px var(--font-display)", color: "var(--text-strong)" }}>All caught up</div>
        <p style={{ color: "var(--text-muted)" }}>Pick your next course from the catalog.</p>
        <Button href="/learn/browse">Browse courses</Button>
      </Card>
    );
  }
  const c = current.course;
  const lessons = player.data?.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, section: s.title }))) ?? [];
  const next = lessons.find((l) => l.id === player.data?.resumeLessonId);
  const pct = current.progress.percent;
  return (
    <div className="relative flex items-center gap-7 overflow-hidden" style={{ borderRadius: 20, background: "var(--ink-900)", color: "#fff", padding: 28 }}>
      {c.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.28 }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, var(--ink-900) 35%, rgba(22,26,51,.6))" }} />
      <div className="relative min-w-0 flex-1">
        <Badge tone="accent">Continue learning</Badge>
        <div style={{ font: "600 24px/32px var(--font-display)", letterSpacing: "-0.02em", marginTop: 14 }}>{next?.title ?? c.title}</div>
        <div style={{ color: "var(--ink-300)", marginTop: 4 }}>
          {c.title}
          {next && ` · ${next.section} · ${next.kind === "QUIZ" ? "Quiz" : next.kind === "ASSIGNMENT" ? "Assignment" : `${next.durationMinutes} min`}`}
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button iconLeft="play" href={playerHref(c.id, player.data?.resumeLessonId)}>
            Resume lesson
          </Button>
          <Button variant="ghost" href="/learn/courses" style={{ color: "#fff" }}>
            My learning
          </Button>
        </div>
      </div>
      <span className="relative hidden sm:inline-grid">
        <ProgressRing value={pct} size={112} stroke={10} track="rgba(255,255,255,.12)">
          <span style={{ color: "#fff" }}>{pct}%</span>
        </ProgressRing>
      </span>
    </div>
  );
}

export function StudentHome() {
  const now = useNow();
  const me = useMe();
  const summary = useQuery({ queryKey: ["learning-summary"], queryFn: () => api.get<LearningSummary>("/me/learning/summary") });
  const enrollments = useEnrollments();
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: () => api.get<Deadline[]>("/me/deadlines") });
  const grades = useQuery({ queryKey: ["grades"], queryFn: () => api.get<MyGrade[]>("/me/grades") });
  const today = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: () => api.get<SessionView[]>(`/me/schedule?${todayRange(now!)}`),
    enabled: now != null,
  });
  const org = me.data?.organization.slug;
  const popular = useQuery({
    queryKey: ["popular", org],
    queryFn: () => api.get<Page<Course>>(`/public/organizations/${org}/courses?sort=POPULAR&size=12`),
    enabled: !!org,
  });

  if (summary.error) return <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />;
  const s = summary.data;
  const firstName = me.data?.user.fullName.split(" ")[0];
  const active = (enrollments.data ?? []).filter((e) => e.status === "ACTIVE");
  const graded = (grades.data ?? []).filter((g) => g.percent != null);
  const avg = graded.length ? Math.round(graded.reduce((a, g) => a + (g.percent ?? 0), 0) / graded.length) : null;
  const enrolledIds = new Set((enrollments.data ?? []).map((e) => e.course.id));
  const recs = (popular.data?.items ?? []).filter((c) => !enrolledIds.has(c.id)).slice(0, 3);
  const goalLeft = s ? Math.max(0, 5 - s.lessonsThisWeek) : null;
  const sessions = (today.data ?? []).filter((x) => !x.cancelled);

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        overline={now ? new Date(now).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }) : "\u00a0"}
        title={now ? `${greeting(new Date(now))}${firstName ? `, ${firstName}` : ""}` : `Welcome${firstName ? `, ${firstName}` : ""}`}
        sub={goalLeft == null ? " " : goalLeft === 0 ? "You've reached your weekly goal. Keep the streak going!" : `You're ${goalLeft} ${goalLeft === 1 ? "lesson" : "lessons"} away from your weekly goal.`}
        actions={
          <Button variant="secondary" iconLeft="compass" href="/learn/browse">
            Browse courses
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {s ? <ContinueHero summary={s} /> : <Skeleton height={190} style={{ borderRadius: 20 }} />}
        <Card title="Today" action={<Badge tone="info" dot>{sessions.length} {sessions.length === 1 ? "session" : "sessions"}</Badge>} padding="12px 20px 18px">
          {today.isLoading ? (
            <Skeleton height={90} />
          ) : sessions.length === 0 ? (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>No live sessions today.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((x) => (
                <a key={x.id} href={x.meetingUrl ?? "/learn/schedule"} target={x.meetingUrl ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-3 no-underline hover:no-underline" style={{ color: "inherit" }}>
                  <span style={{ width: 46, font: "500 12px var(--font-mono)", color: "var(--text-muted)" }}>{time(x.startsAt)}</span>
                  <i style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: `var(--${x.courseHue ?? "orbit"}-500)` }} />
                  <div>
                    <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{x.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{x.courseTitle}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses in progress" value={s ? String(s.inProgress) : "–"} icon="book-open" tone="coral" hint={s ? `${s.completed} completed` : undefined} />
        <StatCard label="Hours learned" value={s ? (s.minutesLearned / 60).toFixed(1) : "–"} icon="clock" tone="orbit" hint={s ? `${s.lessonsThisWeek} lessons this week` : undefined} />
        <StatCard label="Average grade" value={avg == null ? "—" : letter(avg)} icon="award" tone="green" hint={avg == null ? "No graded work yet" : `${avg}% across ${graded.length} graded`} />
        <StatCard label="Certificates" value={s ? String(s.completed) : "–"} icon="badge-check" tone="amber" hint="Shareable anytime" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="mb-3.5 flex items-center justify-between">
            <h3 style={{ font: "600 18px var(--font-display)" }}>In progress</h3>
            <Button variant="ghost" size="sm" iconRight="arrow-right" href="/learn/courses">
              View all
            </Button>
          </div>
          {enrollments.isLoading ? (
            <Skeleton height={300} />
          ) : active.length === 0 ? (
            <EmptyState title="Nothing in progress" message="Enroll in a course to see it here." action={<Button href="/learn/browse">Browse courses</Button>} />
          ) : (
            <div className="ob-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {active.slice(0, 3).map((e) => (
                <CourseCard key={e.id} {...cardProps(e.course)} price={null} progress={e.progress.percent} href={playerHref(e.course.id, e.lastLessonId)} />
              ))}
            </div>
          )}
        </div>
        <Card title="Upcoming deadlines" padding="8px 12px 12px">
          {deadlines.isLoading && <Skeleton height={120} />}
          {deadlines.data?.length === 0 && <p style={{ margin: "8px 10px", color: "var(--text-muted)" }}>No deadlines coming up.</p>}
          {deadlines.data?.slice(0, 5).map((d) => {
            const b = due(d.dueAt, now ?? undefined);
            return (
              <Link key={d.lessonId} href={playerHref(d.courseId, d.lessonId)} className="flex items-start gap-3 no-underline hover:bg-ink-50 hover:no-underline" style={{ padding: 10, borderRadius: 10, color: "inherit" }}>
                <span style={{ width: 36, height: 36, flex: "none", borderRadius: 10, display: "grid", placeItems: "center", background: "var(--surface-sunken)", color: "var(--ink-700)" }}>
                  <Icon name={d.kind === "QUIZ" ? "circle-help" : "file-text"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div style={{ font: "600 14px/20px var(--font-body)", color: "var(--text-strong)" }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {d.courseTitle} · {new Date(d.dueAt).toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <Badge tone={b.tone} style={{ marginTop: 6 }}>
                    {b.label}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </Card>
      </div>
      {recs.length > 0 && (
        <div>
          <div className="mb-3.5 flex items-center justify-between">
            <h3 style={{ font: "600 18px var(--font-display)" }}>Recommended for you</h3>
            <Button variant="ghost" size="sm" iconRight="arrow-right" href="/learn/browse">
              Browse all
            </Button>
          </div>
          <CourseGrid courses={recs} basePath="/learn/browse" />
        </div>
      )}
    </div>
  );
}
