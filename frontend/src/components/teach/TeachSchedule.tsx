"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, Dialog, EmptyState, Input, PageHead, Select, Skeleton, Textarea, useNow, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { time } from "@/lib/format";
import type { CourseCard, SessionKind, SessionView } from "@/lib/types";

const KINDS: { value: SessionKind; label: string }[] = [
  { value: "LIVE_CLASS", label: "Live class" },
  { value: "OFFICE_HOURS", label: "Office hours" },
  { value: "STUDY_GROUP", label: "Study group" },
  { value: "WORKSHOP", label: "Workshop" },
];

function SessionDialog({ courses, initialCourse, onClose }: { courses: CourseCard[]; initialCourse?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ courseId: initialCourse ?? courses[0]?.id ?? "", title: "", kind: "LIVE_CLASS" as SessionKind, date: "", start: "10:00", minutes: "60", meetingUrl: "", location: "", description: "" });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const create = useMutation({
    mutationFn: () => {
      const startsAt = new Date(`${form.date}T${form.start}`);
      const endsAt = new Date(startsAt.getTime() + Number(form.minutes) * 60_000);
      return api.post(`/instructor/courses/${form.courseId}/sessions`, {
        title: form.title,
        kind: form.kind,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        meetingUrl: form.meetingUrl || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teach-sessions"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      toast({ title: "Session scheduled", message: "Enrolled learners have been notified." });
      onClose();
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't schedule", message: e.message }),
  });
  const valid = form.courseId && form.title.trim() && form.date && form.start && Number(form.minutes) > 0;
  return (
    <Dialog
      open
      onClose={onClose}
      icon="calendar-plus"
      iconTone="orbit"
      width={560}
      title="Schedule a live session"
      description="Learners in the course see it in their schedule and get a notification."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>
            Schedule
          </Button>
        </>
      }
    >
      <div className="mt-1.5 flex flex-col gap-3.5">
        <Select label="Course" value={form.courseId} onChange={(e) => set({ courseId: e.target.value })} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <Input label="Title" placeholder="e.g. Neural nets Q&A" value={form.title} onChange={(e) => set({ title: e.target.value })} />
          <Select label="Type" value={form.kind} onChange={(e) => set({ kind: e.target.value as SessionKind })} options={KINDS} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          <Input label="Starts" type="time" value={form.start} onChange={(e) => set({ start: e.target.value })} />
          <Input label="Minutes" type="number" min={5} max={720} value={form.minutes} onChange={(e) => set({ minutes: e.target.value })} />
        </div>
        <Input label="Meeting link" iconLeft="video" placeholder="https://meet…" value={form.meetingUrl} onChange={(e) => set({ meetingUrl: e.target.value })} />
        <Input label="Room (optional)" value={form.location} onChange={(e) => set({ location: e.target.value })} />
        <Textarea label="Notes (optional)" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
    </Dialog>
  );
}

export function TeachSchedule() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const now = useNow();
  const courses = useQuery({ queryKey: ["instructor-courses"], queryFn: () => api.get<CourseCard[]>("/instructor/courses") });
  const sessions = useQuery({
    queryKey: ["teach-sessions"],
    queryFn: () => {
      const from = new Date(now!);
      from.setHours(0, 0, 0, 0);
      return api.get<SessionView[]>(`/instructor/sessions?from=${from.toISOString()}&to=${new Date(from.getTime() + 60 * 86_400_000).toISOString()}`);
    },
    enabled: now != null,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/instructor/sessions/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teach-sessions"] }),
  });
  const creating = params.get("new") === "1";
  const live = (courses.data ?? []).filter((c) => c.status === "PUBLISHED");
  const byDay = new Map<string, SessionView[]>();
  for (const s of sessions.data ?? []) {
    const day = new Date(s.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  return (
    <div className="max-w-[920px]">
      <PageHead
        title="Live sessions"
        sub="Classes, office hours and study groups for your courses over the next 60 days"
        actions={
          <Button iconLeft="calendar-plus" disabled={!live.length} onClick={() => router.replace(`${pathname}?new=1`)}>
            Schedule session
          </Button>
        }
      />
      {!sessions.data ? (
        <Skeleton height={240} />
      ) : !byDay.size ? (
        <EmptyState icon="calendar" title="Nothing scheduled" message={live.length ? "Schedule a live class, office hours or a study group." : "Publish a course first."} />
      ) : (
        <div className="flex flex-col gap-5">
          {[...byDay].map(([day, list]) => (
            <div key={day}>
              <div className="ob-overline mb-2">{day}</div>
              <Card padding="6px 16px">
                {list.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3.5" style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", opacity: s.cancelled ? 0.55 : 1 }}>
                    <span style={{ width: 92, font: "500 12px var(--font-mono)", color: "var(--text-muted)" }}>
                      {time(s.startsAt)}–{time(s.endsAt)}
                    </span>
                    <i style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: `var(--${s.courseHue ?? "orbit"}-500)` }} />
                    <div className="min-w-0 flex-1">
                      <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {s.courseTitle} · {KINDS.find((k) => k.value === s.kind)?.label}
                      </div>
                    </div>
                    {s.cancelled ? (
                      <Badge tone="danger">Cancelled</Badge>
                    ) : (
                      <>
                        {s.meetingUrl && (
                          <Button size="sm" variant="secondary" iconLeft="video" href={s.meetingUrl} target="_blank" rel="noreferrer">
                            Start
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === s.id} onClick={() => confirm(`Cancel “${s.title}”? Learners will be notified.`) && cancel.mutate(s.id)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
      {creating && live.length > 0 && <SessionDialog courses={live} initialCourse={params.get("course") ?? undefined} onClose={() => router.replace(pathname)} />}
    </div>
  );
}
