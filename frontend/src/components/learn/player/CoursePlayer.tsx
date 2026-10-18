"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Discussion } from "@/components/learn/Discussion";
import { Avatar, Badge, Button, Card, Dialog, ErrorState, Icon, IconButton, LessonItem, ProgressBar, Skeleton, Tabs, Textarea, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { CompletionResult, LessonContent, PlayerView, ThreadSummary, Page } from "@/lib/types";

import { AssignmentLesson } from "./AssignmentLesson";
import { useResources, LessonResources } from "./LessonResources";
import { Markdown } from "./Markdown";
import { QuizLesson } from "./QuizLesson";
import { VideoLesson } from "./VideoLesson";

type Tab = "overview" | "resources" | "discussion";

function ReviewDialog({ courseId, open, onClose }: { courseId: string; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const save = useMutation({
    mutationFn: () => api.put(`/me/courses/${courseId}/review`, { rating, comment }),
    onSuccess: () => {
      onClose();
      toast({ title: "Thanks for your review", message: "It helps other learners choose." });
    },
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon="star"
      title="Rate this course"
      description="Your review appears on the course page with your name."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Post review
          </Button>
        </>
      }
    >
      <div className="mb-3.5 flex gap-1.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} style={{ background: "none", border: 0, padding: 2, cursor: "pointer" }}>
            <Icon name="star" size={28} color="var(--amber-500)" weight={n <= rating ? "fill" : "regular"} />
          </button>
        ))}
      </div>
      <Textarea label="What did you think?" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" />
      {save.error && <div className="ob-help ob-help--error" style={{ marginTop: 8 }}>{save.error.message}</div>}
    </Dialog>
  );
}

export function CoursePlayer({ courseId }: { courseId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [reviewing, setReviewing] = useState(false);

  const player = useQuery({ queryKey: ["player", courseId], queryFn: () => api.get<PlayerView>(`/me/courses/${courseId}/player`), retry: false });
  const flat = player.data?.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, section: s.title }))) ?? [];
  const lessonId = params.get("lesson") ?? player.data?.resumeLessonId ?? flat[0]?.id;
  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.get<LessonContent>(`/me/lessons/${lessonId}`),
    enabled: !!lessonId && !!player.data,
  });
  const resources = useResources(courseId);
  const threads = useQuery({
    queryKey: ["threads", courseId, lessonId ?? "all"],
    queryFn: () => api.get<Page<ThreadSummary>>(`/me/courses/${courseId}/threads?size=30&lessonId=${lessonId}`),
    enabled: !!lessonId && !!player.data,
  });

  const refresh = (r?: CompletionResult) => {
    qc.invalidateQueries({ queryKey: ["player", courseId] });
    qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
    qc.invalidateQueries({ queryKey: ["learning-summary"] });
    if (r?.status === "COMPLETED" && r.certificateCode) {
      toast({ tone: "accent", title: "Course complete!", message: "Your certificate is ready." });
    }
  };
  const go = (id: string | null | undefined) => {
    if (!id) return;
    setTab("overview");
    router.replace(`${pathname}?lesson=${id}`, { scroll: false });
  };
  const complete = useMutation({
    mutationFn: () => api.post<CompletionResult>(`/me/lessons/${lessonId}/complete`),
    onSuccess: (r) => {
      refresh(r);
      const next = lesson.data?.nextLessonId;
      if (r.status !== "COMPLETED" && next) {
        toast({ title: "Lesson complete", message: `Next up: ${flat.find((l) => l.id === next)?.title ?? "next lesson"}` });
        go(next);
      }
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save", message: e.message }),
  });

  if (player.error) {
    const notEnrolled = player.error instanceof ApiError && player.error.status === 403;
    return notEnrolled ? (
      <Card padding={40} style={{ textAlign: "center" }}>
        <div style={{ font: "600 20px var(--font-display)", color: "var(--text-strong)" }}>You’re not enrolled in this course</div>
        <div style={{ marginTop: 14 }}>
          <Button href="/learn/browse">Browse courses</Button>
        </div>
      </Card>
    ) : (
      <ErrorState message={player.error.message} onRetry={() => player.refetch()} />
    );
  }
  if (!player.data) return <Skeleton height={520} />;

  const p = player.data;
  const c = p.course;
  const index = flat.findIndex((l) => l.id === lessonId);
  const current = flat[index];
  const l = lesson.data;
  const done = !!current?.completed;
  const enrolled = !p.staffPreview;
  const status = (id: string, completed: boolean) => (completed ? "done" : id === p.resumeLessonId ? "current" : "todo") as "done" | "current" | "todo";
  const resourceCount = (resources.data ?? []).filter((r) => !r.lessonId || r.lessonId === lessonId).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="mb-3.5 flex flex-wrap items-center gap-2" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          <Link href="/learn/courses">My learning</Link>
          <Icon name="chevron-right" size={14} />
          <Link href={`/learn/browse/${c.slug}`}>{c.title}</Link>
          {current && (
            <>
              <Icon name="chevron-right" size={14} />
              <span style={{ color: "var(--text-strong)" }}>{current.title}</span>
            </>
          )}
        </div>
        {p.staffPreview && (
          <div className="mb-3.5 flex items-center gap-2" style={{ padding: "10px 14px", borderRadius: 12, background: "var(--orbit-100)", color: "var(--orbit-700)", fontSize: 13, fontWeight: 500 }}>
            <Icon name="eye" size={16} />
            Staff preview — progress isn’t recorded.
          </div>
        )}

        {!l || lesson.isLoading ? (
          <div className="ob-skeleton" style={{ aspectRatio: "16/9", borderRadius: 20 }} />
        ) : l.kind === "VIDEO" ? (
          <VideoLesson key={l.id} lesson={l} cover={c.coverUrl} section={current?.section ?? ""} onEnded={() => enrolled && !done && complete.mutate()} />
        ) : l.kind === "READING" ? (
          <Card padding="32px 36px">
            <div className="ob-overline" style={{ color: "var(--text-muted)" }}>
              Reading · {l.durationMinutes} min
            </div>
            <div style={{ font: "600 24px/32px var(--font-display)", color: "var(--text-strong)", margin: "10px 0 14px" }}>{l.title}</div>
            {l.content ? <Markdown text={l.content} /> : <p style={{ color: "var(--text-muted)" }}>This reading has no text yet.</p>}
          </Card>
        ) : l.kind === "QUIZ" ? (
          <QuizLesson key={l.id} lessonId={l.id} title={l.title} onPassed={() => refresh()} />
        ) : (
          <AssignmentLesson key={l.id} lessonId={l.id} courseId={courseId} title={l.title} onSubmitted={() => refresh()} />
        )}

        <div className="my-[18px] flex flex-wrap items-start justify-between gap-5" style={{ marginTop: 22 }}>
          <div>
            <h1 style={{ font: "600 24px/32px var(--font-display)", letterSpacing: "-0.02em" }}>{current?.title ?? c.title}</h1>
            <div className="mt-1.5 flex items-center gap-2" style={{ color: "var(--text-muted)", fontSize: 13 }}>
              <Avatar name={c.instructorName} size={22} />
              {c.instructorName} · {current?.section}, lesson {index + 1} of {flat.length}
            </div>
          </div>
          <div className="flex flex-none gap-2.5">
            <IconButton icon="chevron-left" label="Previous lesson" variant="secondary" disabled={!l?.previousLessonId} onClick={() => go(l?.previousLessonId)} />
            {enrolled && l && (l.kind === "VIDEO" || l.kind === "READING") && (
              <Button variant={done ? "soft" : "primary"} iconLeft={done ? "check" : "circle-check"} loading={complete.isPending} onClick={() => (done ? go(l.nextLessonId) : complete.mutate())} disabled={done && !l.nextLessonId}>
                {done ? (l.nextLessonId ? "Next lesson" : "Completed") : "Mark complete"}
              </Button>
            )}
            <IconButton icon="chevron-right" label="Next lesson" variant="secondary" disabled={!l?.nextLessonId} onClick={() => go(l?.nextLessonId)} />
          </div>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { label: "Overview", value: "overview" },
            { label: "Resources", value: "resources", count: resourceCount },
            { label: "Discussion", value: "discussion", count: threads.data?.total },
          ]}
        />
        <div style={{ padding: "18px 0", maxWidth: 680, fontSize: 15, lineHeight: "26px" }}>
          {tab === "overview" && (
            <p style={{ margin: 0 }}>
              {c.tagline} {l?.kind === "VIDEO" && l.content ? l.content : `In this lesson you’ll work through “${current?.title}” step by step.`}
            </p>
          )}
          {tab === "resources" && lessonId && <LessonResources courseId={courseId} lessonId={lessonId} />}
          {tab === "discussion" && lessonId && <Discussion courseId={courseId} lessonId={lessonId} courseStaff={p.staffPreview} />}
        </div>
      </div>

      <div className="flex flex-col gap-4 self-start xl:sticky xl:top-[88px]">
        <Card padding="8px">
          <div style={{ padding: "12px 12px 8px" }}>
            <div style={{ font: "600 16px var(--font-display)", color: "var(--text-strong)" }}>Course content</div>
            <ProgressBar value={p.progress.percent} label={`${p.progress.completedLessons} of ${p.progress.totalLessons} lessons`} showValue style={{ marginTop: 10 }} color={p.progress.percent >= 100 ? "var(--success)" : undefined} />
          </div>
          {p.sections.map((s) => (
            <div key={s.id}>
              <div className="ob-overline" style={{ padding: "12px 12px 4px" }}>
                {s.title}
              </div>
              {s.lessons.map((x, i) => (
                <LessonItem
                  key={x.id}
                  index={i + 1}
                  title={x.title}
                  kind={x.kind}
                  duration={x.kind === "QUIZ" ? "Quick check" : x.kind === "ASSIGNMENT" ? "Graded" : `${x.durationMinutes} min`}
                  status={status(x.id, x.completed)}
                  active={x.id === lessonId}
                  onClick={() => go(x.id)}
                />
              ))}
            </div>
          ))}
        </Card>
        {enrolled && (
          <Card padding={18}>
            {p.status === "COMPLETED" && p.certificateCode ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--green-100)", color: "var(--green-700)" }}>
                    <Icon name="award" size={18} />
                  </span>
                  <div>
                    <div style={{ font: "600 14px var(--font-display)", color: "var(--text-strong)" }}>Course complete</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Certificate {p.certificateCode}</div>
                  </div>
                </div>
                <Button variant="secondary" iconLeft="award" href={`/certificates/${p.certificateCode}`}>
                  View certificate
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <Badge tone="accent">{p.progress.percent}%</Badge>
                Finish every lesson to earn your certificate.
              </div>
            )}
            <Button variant="ghost" size="sm" iconLeft="star" onClick={() => setReviewing(true)} style={{ marginTop: 10 }}>
              Rate this course
            </Button>
          </Card>
        )}
      </div>
      <ReviewDialog courseId={courseId} open={reviewing} onClose={() => setReviewing(false)} />
    </div>
  );
}
