"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Icon, Input, PageHead, RelativeTime, Select, Skeleton, Tabs, Textarea, useToast, type BadgeTone } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { CourseCard, Gradebook, SubmissionView } from "@/lib/types";

/** Grade or return one submission. Used inline in the gradebook and on its own page. */
export function GradeForm({ submission, onDone }: { submission: SubmissionView; onDone?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [points, setPoints] = useState(submission.points != null ? String(submission.points) : "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const done = () => {
    qc.invalidateQueries({ queryKey: ["grading-queue"] });
    qc.invalidateQueries({ queryKey: ["gradebook"] });
    qc.invalidateQueries({ queryKey: ["submission", submission.id] });
    qc.invalidateQueries({ queryKey: ["instructor-overview"] });
    onDone?.();
  };
  const grade = useMutation({
    mutationFn: () => api.put(`/instructor/submissions/${submission.id}/grade`, { points: Number(points), feedback }),
    onSuccess: () => {
      toast({ title: "Grade saved", message: `${submission.learnerName} · ${submission.lessonTitle} · ${points}/${submission.maxPoints}` });
      done();
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save grade", message: e.message }),
  });
  const ret = useMutation({
    mutationFn: () => api.post(`/instructor/submissions/${submission.id}/return`, { feedback }),
    onSuccess: () => {
      toast({ tone: "info", title: "Returned for revision", message: submission.learnerName ?? undefined });
      done();
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't return", message: e.message }),
  });
  const open = async () => {
    const link = await api.get<{ url: string }>(`/me/files/${submission.fileId}/download`);
    window.open(link.url, "_blank", "noopener");
  };
  const valid = points !== "" && Number(points) >= 0 && Number(points) <= submission.maxPoints;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2" style={{ padding: 16, borderRadius: 14, background: "var(--paper-50)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex flex-wrap items-center gap-2" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Submitted {dateTime(submission.submittedAt)}
          {submission.late && <Badge tone="danger">Late</Badge>}
        </div>
        {submission.fileName && (
          <button type="button" onClick={open} className="flex items-center gap-2" style={{ background: "none", border: 0, padding: 0, color: "var(--text-accent)", cursor: "pointer", font: "inherit", fontWeight: 600 }}>
            <Icon name="paperclip" size={16} />
            {submission.fileName}
          </button>
        )}
        {submission.linkUrl && (
          <a href={submission.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
            <Icon name="external-link" size={16} />
            {submission.linkUrl}
          </a>
        )}
        {submission.body && <div style={{ whiteSpace: "pre-line" }}>{submission.body}</div>}
      </div>
      <Input label={`Score (out of ${submission.maxPoints})`} type="number" min={0} max={submission.maxPoints} value={points} onChange={(e) => setPoints(e.target.value)} placeholder={`0–${submission.maxPoints}`} />
      <Textarea label="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Nice work on the cost function derivation…" />
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" iconLeft="rotate-ccw" disabled={!feedback.trim()} loading={ret.isPending} onClick={() => ret.mutate()} title="Feedback is required to return work">
          Return for revision
        </Button>
        <Button iconLeft="check" disabled={!valid} loading={grade.isPending} onClick={() => grade.mutate()}>
          Save grade
        </Button>
      </div>
    </div>
  );
}

const CELL_TONE: Record<string, BadgeTone> = { SUBMITTED: "info", GRADED: "success", RETURNED: "warning", MISSING: "danger", ATTEMPTED: "success", NOT_STARTED: "neutral" };
const CELL_LABEL: Record<string, string> = { SUBMITTED: "Submitted", GRADED: "Graded", RETURNED: "Returned", MISSING: "Missing", ATTEMPTED: "Attempted", NOT_STARTED: "Not started" };

function GradebookTable({ courseId }: { courseId: string }) {
  const book = useQuery({ queryKey: ["gradebook", courseId], queryFn: () => api.get<Gradebook>(`/instructor/courses/${courseId}/gradebook`) });
  const queue = useQuery({ queryKey: ["grading-queue", courseId], queryFn: () => api.get<SubmissionView[]>(`/instructor/grading-queue?courseId=${courseId}`) });
  const [grading, setGrading] = useState<SubmissionView | null>(null);
  if (book.error) return <ErrorState message={book.error.message} />;
  if (!book.data) return <Skeleton height={300} />;
  const b = book.data;
  const pending = new Map((queue.data ?? []).map((s) => [`${s.userId}:${s.lessonId}`, s]));
  const exportCsv = () => {
    const head = ["Learner", "Email", ...b.columns.map((c) => c.title), "Average %"];
    const rows = b.rows.map((r) => [r.fullName ?? "", r.email ?? "", ...r.cells.map((c) => (c.points != null ? String(c.points) : c.percent != null ? `${c.percent}%` : CELL_LABEL[c.status] ?? c.status)), r.averagePercent != null ? String(r.averagePercent) : ""]);
    const csv = [head, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${b.courseTitle} gradebook.csv`;
    a.click();
  };
  const cols = `minmax(200px,2fr) ${b.columns.map(() => "minmax(110px,1fr)").join(" ")} 90px`;
  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <span style={{ color: "var(--text-muted)" }}>
          {b.rows.length} learners{b.classAveragePercent != null ? ` · class average ${b.classAveragePercent}%` : ""}
        </span>
        <Button variant="secondary" iconLeft="download" size="sm" onClick={exportCsv} disabled={!b.rows.length}>
          Export CSV
        </Button>
      </div>
      {!b.columns.length ? (
        <EmptyState icon="clipboard-check" title="Nothing graded in this course" message="Add a quiz or assignment lesson to start a gradebook." />
      ) : (
        <Card padding={0} style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 200 + b.columns.length * 120 + 90 }}>
            <div className="grid" style={{ gridTemplateColumns: cols, padding: "12px 20px", background: "var(--paper-50)", borderBottom: "1px solid var(--border-subtle)", borderRadius: "16px 16px 0 0", font: "600 11px/16px var(--font-body)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              <span>Learner</span>
              {b.columns.map((c) => (
                <span key={c.lessonId} title={c.title} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                  {c.title}
                </span>
              ))}
              <span>Average</span>
            </div>
            {b.rows.map((r) => (
              <div key={r.userId} className="grid items-center" style={{ gridTemplateColumns: cols, padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-2.5">
                  <Avatar src={r.avatarUrl} name={r.fullName} size={30} />
                  <span style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{r.fullName}</span>
                  {r.averagePercent != null && r.averagePercent < 60 && <Badge tone="danger">At risk</Badge>}
                </div>
                {r.cells.map((c) => {
                  const s = pending.get(`${r.userId}:${c.lessonId}`);
                  return (
                    <span key={c.lessonId} className="flex flex-wrap items-center gap-1.5">
                      {c.percent != null ? (
                        <span style={{ font: "500 13px var(--font-mono)", color: c.percent < 60 ? "var(--danger-text)" : "var(--text-strong)" }}>{c.points != null ? `${c.points}` : `${c.percent}%`}</span>
                      ) : c.status !== "SUBMITTED" ? (
                        <Badge tone={CELL_TONE[c.status] ?? "neutral"} dot>
                          {CELL_LABEL[c.status] ?? c.status}
                        </Badge>
                      ) : null}
                      {s && (
                        <Button size="sm" variant="soft" onClick={() => setGrading(s)}>
                          Grade
                        </Button>
                      )}
                    </span>
                  );
                })}
                <span style={{ font: "600 14px var(--font-display)", color: "var(--text-strong)" }}>{r.averagePercent != null ? `${r.averagePercent}%` : "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {grading && (
        <div className="ob-scrim" onClick={() => setGrading(null)}>
          <div className="ob-dialog" style={{ maxWidth: 560 }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="ob-dialog__head">
              <div className="flex-1">
                <div className="ob-dialog__title">Grade {grading.learnerName}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                  {grading.lessonTitle} · submitted <RelativeTime iso={grading.submittedAt} />
                </div>
              </div>
            </div>
            <div className="ob-dialog__body">
              <GradeForm submission={grading} onDone={() => setGrading(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GradingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const courses = useQuery({ queryKey: ["instructor-courses"], queryFn: () => api.get<CourseCard[]>("/instructor/courses") });
  const queue = useQuery({ queryKey: ["grading-queue"], queryFn: () => api.get<SubmissionView[]>("/instructor/grading-queue") });
  const live = (courses.data ?? []).filter((c) => c.status !== "DRAFT");
  const courseId = params.get("course") ?? live[0]?.id;
  const tab = params.get("course") ? "book" : (params.get("tab") ?? "queue");
  const setTab = (t: string) => router.replace(`${pathname}?tab=${t}${t === "book" && courseId ? `&course=${courseId}` : ""}`);
  const course = live.find((c) => c.id === courseId);
  return (
    <div>
      <PageHead
        overline={tab === "book" ? course?.title : "Instructor"}
        title="Gradebook"
        sub={tab === "queue" ? `${queue.data?.length ?? 0} submissions waiting` : undefined}
        actions={
          tab === "book" &&
          live.length > 0 && <Select size="sm" aria-label="Course" value={courseId} onChange={(e) => router.replace(`${pathname}?course=${e.target.value}`)} options={live.map((c) => ({ value: c.id, label: c.title }))} />
        }
      />
      <Tabs value={tab} onChange={setTab} items={[{ label: "To grade", value: "queue", count: queue.data?.length }, { label: "Gradebook", value: "book" }]} style={{ marginBottom: 20 }} />
      {tab === "queue" ? (
        queue.isLoading ? (
          <Skeleton height={240} />
        ) : !queue.data?.length ? (
          <EmptyState icon="circle-check" title="All caught up" message="New submissions appear here, oldest first." />
        ) : (
          <Card padding="6px 12px">
            {queue.data.map((s) => (
              <Link key={s.id} href={`/teach/grading/${s.id}`} className="flex items-center gap-3 no-underline hover:bg-ink-50 hover:no-underline" style={{ padding: 10, borderRadius: 10, color: "inherit" }}>
                <Avatar src={s.learnerAvatarUrl} name={s.learnerName} size={36} />
                <div className="min-w-0 flex-1">
                  <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{s.learnerName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {s.lessonTitle} · {s.courseTitle} · <RelativeTime iso={s.submittedAt} />
                  </div>
                </div>
                {s.late && <Badge tone="danger">Late</Badge>}
                <span className="ob-btn ob-btn--secondary ob-btn--sm">Grade</span>
              </Link>
            ))}
          </Card>
        )
      ) : courseId ? (
        <GradebookTable key={courseId} courseId={courseId} />
      ) : courses.isLoading ? (
        <Skeleton height={240} />
      ) : (
        <EmptyState icon="library" title="No published courses" message="Publish a course to start a gradebook." />
      )}
    </div>
  );
}

export function SubmissionPage({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const s = useQuery({ queryKey: ["submission", submissionId], queryFn: () => api.get<SubmissionView>(`/instructor/submissions/${submissionId}`) });
  if (s.error) return <ErrorState message={s.error.message} />;
  if (!s.data) return <Skeleton height={360} />;
  const x = s.data;
  return (
    <div className="max-w-[720px]">
      <div className="mb-3 flex items-center gap-2" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        <Link href="/teach/grading">Gradebook</Link>
        <Icon name="chevron-right" size={14} />
        <span style={{ color: "var(--text-strong)" }}>{x.learnerName}</span>
      </div>
      <PageHead
        overline={x.courseTitle}
        title={x.lessonTitle ?? "Submission"}
        actions={
          <Badge tone={x.status === "GRADED" ? "success" : x.status === "RETURNED" ? "warning" : "info"} dot>
            {x.status === "GRADED" ? `Graded · ${x.points}/${x.maxPoints}` : x.status === "RETURNED" ? "Returned" : "Awaiting grade"}
          </Badge>
        }
      />
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={x.learnerAvatarUrl} name={x.learnerName} size={40} />
          <div style={{ font: "600 15px var(--font-body)", color: "var(--text-strong)" }}>{x.learnerName}</div>
        </div>
        <GradeForm submission={x} onDone={() => router.push("/teach/grading")} />
      </Card>
    </div>
  );
}
