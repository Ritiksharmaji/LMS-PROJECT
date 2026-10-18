"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Checkbox, Dialog, IconButton, Input, ProgressBar, Radio, Select, Skeleton, Switch, Textarea, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AssignmentEditorView, LessonView, QuestionKind, QuizEditorView, VideoView } from "@/lib/types";

interface QuestionDraft {
  prompt: string;
  kind: QuestionKind;
  options: string[];
  correct: number[];
  explanation: string;
  points: number;
}

/** `datetime-local` value (local time) from an ISO instant, and back. */
const toLocal = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function useNotFoundIsEmpty<T>(key: unknown[], path: string) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await api.get<T>(path);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}

function VideoSettings({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const video = useNotFoundIsEmpty<VideoView>(["video", lessonId], `/me/lessons/${lessonId}/video`);
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const saveUrl = useMutation({
    mutationFn: () => api.put(`/instructor/lessons/${lessonId}/video`, { url }),
    onSuccess: () => {
      setUrl(null);
      qc.invalidateQueries({ queryKey: ["video", lessonId] });
      toast({ title: "Video saved" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save video", message: e.message }),
  });
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const ticket = await api.post<{ uploadUrl: string }>(`/instructor/lessons/${lessonId}/video/upload`);
      setProgress(0);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", ticket.uploadUrl);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });
      toast({ title: "Video uploaded", message: "It will be ready to watch once processing finishes." });
      qc.invalidateQueries({ queryKey: ["video", lessonId] });
    } catch (e) {
      toast({ tone: "danger", title: "Video upload unavailable", message: e instanceof Error ? e.message : undefined });
    } finally {
      setProgress(null);
    }
  };
  if (video.isLoading) return <Skeleton height={80} />;
  const v = video.data;
  return (
    <div className="flex flex-col gap-3">
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {v ? (v.status === "READY" ? `Ready · ${v.provider === "MUX" ? "uploaded video" : v.streamUrl}` : `Status: ${v.status.toLowerCase().replace("_", " ")}`) : "No video yet."}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url) saveUrl.mutate();
        }}
      >
        <Input size="sm" iconLeft="link" placeholder="https://… (MP4 or HLS)" value={url ?? (v?.provider === "URL" ? v.streamUrl ?? "" : "")} onChange={(e) => setUrl(e.target.value)} containerStyle={{ flex: 1 }} aria-label="Video URL" />
        <Button size="sm" variant="secondary" type="submit" loading={saveUrl.isPending} disabled={!url}>
          Use link
        </Button>
      </form>
      <label className="ob-btn ob-btn--ghost ob-btn--sm" style={{ cursor: "pointer", alignSelf: "flex-start" }}>
        Or upload a video file
        <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {progress != null && <ProgressBar value={progress} showValue label="Uploading video" />}
    </div>
  );
}

function QuizSettings({ lessonId }: { lessonId: string }) {
  const toast = useToast();
  const quiz = useNotFoundIsEmpty<QuizEditorView>(["quiz-editor", lessonId], `/instructor/lessons/${lessonId}/quiz`);
  const [draft, setDraft] = useState<{ passPercent: number; maxAttempts: string; dueAt: string; questions: QuestionDraft[] } | null>(null);
  const save = useMutation({
    mutationFn: () =>
      api.put(`/instructor/lessons/${lessonId}/quiz`, {
        passPercent: draft!.passPercent,
        maxAttempts: draft!.maxAttempts ? Number(draft!.maxAttempts) : null,
        dueAt: fromLocal(draft!.dueAt),
        questions: draft!.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()), explanation: q.explanation || null })),
      }),
    onSuccess: () => {
      quiz.refetch();
      toast({ title: "Quiz saved" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save quiz", message: e.message }),
  });
  if (quiz.isLoading) return <Skeleton height={160} />;
  const d =
    draft ??
    (quiz.data
      ? {
          passPercent: quiz.data.passPercent,
          maxAttempts: quiz.data.maxAttempts ? String(quiz.data.maxAttempts) : "",
          dueAt: toLocal(quiz.data.dueAt),
          questions: quiz.data.questions.map((q) => ({ prompt: q.prompt, kind: q.kind, options: q.options, correct: q.correct, explanation: q.explanation ?? "", points: q.points })),
        }
      : { passPercent: 70, maxAttempts: "", dueAt: "", questions: [{ prompt: "", kind: "SINGLE" as QuestionKind, options: ["", ""], correct: [0], explanation: "", points: 1 }] });
  const update = (patch: Partial<typeof d>) => setDraft({ ...d, ...patch });
  const setQ = (i: number, patch: Partial<QuestionDraft>) => update({ questions: d.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const valid = d.questions.length > 0 && d.questions.every((q) => q.prompt.trim() && q.options.length >= 2 && q.options.every((o) => o.trim()) && q.correct.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Pass mark (%)" type="number" min={0} max={100} value={d.passPercent} onChange={(e) => update({ passPercent: Number(e.target.value) })} />
        <Input label="Attempts allowed" type="number" min={1} placeholder="Unlimited" value={d.maxAttempts} onChange={(e) => update({ maxAttempts: e.target.value })} />
        <Input label="Due (optional)" type="datetime-local" value={d.dueAt} onChange={(e) => update({ dueAt: e.target.value })} />
      </div>
      {d.questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-2.5" style={{ padding: 14, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--paper-50)" }}>
          <div className="flex items-center gap-2">
            <span style={{ font: "600 13px var(--font-body)", color: "var(--text-strong)" }}>Question {i + 1}</span>
            <span className="flex-1" />
            <Select size="sm" aria-label="Question type" value={q.kind} onChange={(e) => setQ(i, { kind: e.target.value as QuestionKind, correct: q.correct.slice(0, e.target.value === "SINGLE" ? 1 : undefined) })} options={[{ value: "SINGLE", label: "One answer" }, { value: "MULTIPLE", label: "Several answers" }]} />
            <IconButton icon="trash-2" label="Remove question" size="sm" disabled={d.questions.length === 1} onClick={() => update({ questions: d.questions.filter((_, j) => j !== i) })} />
          </div>
          <Input placeholder="Question" value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} aria-label={`Question ${i + 1}`} />
          {q.options.map((o, j) => {
            const Control = q.kind === "MULTIPLE" ? Checkbox : Radio;
            return (
              <div key={j} className="flex items-center gap-2">
                <Control
                  name={`correct-${i}`}
                  aria-label={`Option ${j + 1} is correct`}
                  checked={q.correct.includes(j)}
                  onChange={() => setQ(i, { correct: q.kind === "MULTIPLE" ? (q.correct.includes(j) ? q.correct.filter((c) => c !== j) : [...q.correct, j].sort()) : [j] })}
                />
                <Input size="sm" placeholder={`Option ${j + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} containerStyle={{ flex: 1 }} aria-label={`Option ${j + 1}`} />
                <IconButton
                  icon="x"
                  label="Remove option"
                  size="sm"
                  disabled={q.options.length <= 2}
                  onClick={() => setQ(i, { options: q.options.filter((_, k) => k !== j), correct: q.correct.filter((c) => c !== j).map((c) => (c > j ? c - 1 : c)) })}
                />
              </div>
            );
          })}
          <Button size="sm" variant="ghost" iconLeft="plus" style={{ alignSelf: "flex-start" }} disabled={q.options.length >= 10} onClick={() => setQ(i, { options: [...q.options, ""] })}>
            Add option
          </Button>
          <Input size="sm" placeholder="Explanation shown after answering (optional)" value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} aria-label="Explanation" />
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" iconLeft="plus" onClick={() => update({ questions: [...d.questions, { prompt: "", kind: "SINGLE", options: ["", ""], correct: [0], explanation: "", points: 1 }] })}>
          Add question
        </Button>
        <span className="flex-1" />
        <Button size="sm" iconLeft="save" loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
          Save quiz
        </Button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tick the correct answer(s) next to each option. Learners never see the answer key.</div>
    </div>
  );
}

function AssignmentSettings({ lessonId }: { lessonId: string }) {
  const toast = useToast();
  const a = useNotFoundIsEmpty<AssignmentEditorView>(["assignment-editor", lessonId], `/instructor/lessons/${lessonId}/assignment`);
  const [draft, setDraft] = useState<{ instructions: string; dueAt: string; maxPoints: number; allowLate: boolean } | null>(null);
  const save = useMutation({
    mutationFn: () => api.put(`/instructor/lessons/${lessonId}/assignment`, { instructions: draft!.instructions, dueAt: fromLocal(draft!.dueAt), maxPoints: draft!.maxPoints, allowLate: draft!.allowLate }),
    onSuccess: () => {
      a.refetch();
      toast({ title: "Assignment saved" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save", message: e.message }),
  });
  if (a.isLoading) return <Skeleton height={160} />;
  const d = draft ?? { instructions: a.data?.instructions ?? "", dueAt: toLocal(a.data?.dueAt), maxPoints: a.data?.maxPoints ?? 100, allowLate: a.data?.allowLate ?? true };
  const update = (p: Partial<typeof d>) => setDraft({ ...d, ...p });
  return (
    <div className="flex flex-col gap-4">
      <Textarea label="Instructions" rows={6} value={d.instructions} onChange={(e) => update({ instructions: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Due" type="datetime-local" value={d.dueAt} onChange={(e) => update({ dueAt: e.target.value })} />
        <Input label="Points" type="number" min={1} max={1000} value={d.maxPoints} onChange={(e) => update({ maxPoints: Number(e.target.value) })} />
      </div>
      <Switch label="Accept late submissions" description="Late work is flagged in the grading queue." checked={d.allowLate} onChange={(e) => update({ allowLate: e.target.checked })} />
      <Button size="sm" iconLeft="save" loading={save.isPending} onClick={() => save.mutate()} style={{ alignSelf: "flex-end" }}>
        Save assignment
      </Button>
    </div>
  );
}

export function LessonEditor({ lesson, onClose, onSaved }: { lesson: LessonView; courseId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(lesson.title);
  const [minutes, setMinutes] = useState(String(lesson.durationMinutes));
  const [content, setContent] = useState(lesson.content ?? "");
  const [preview, setPreview] = useState(lesson.preview);
  const save = useMutation({
    mutationFn: () => api.patch(`/instructor/lessons/${lesson.id}`, { title, durationMinutes: Number(minutes) || 0, content, preview }),
    onSuccess: () => {
      onSaved();
      toast({ title: "Lesson saved" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save", message: e.message }),
  });
  const timed = lesson.kind === "VIDEO" || lesson.kind === "READING";
  return (
    <Dialog
      open
      onClose={onClose}
      width={720}
      icon={lesson.kind === "VIDEO" ? "play" : lesson.kind === "READING" ? "file-text" : lesson.kind === "QUIZ" ? "circle-help" : "clipboard-check"}
      iconTone="orbit"
      title="Edit lesson"
      description={lesson.kind.charAt(0) + lesson.kind.slice(1).toLowerCase()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button iconLeft="save" loading={save.isPending} disabled={!title.trim()} onClick={() => save.mutate()}>
            Save lesson
          </Button>
        </>
      }
    >
      <div className="flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          {timed && <Input label="Minutes" type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />}
        </div>
        {timed && (
          <Textarea
            label={lesson.kind === "READING" ? "Reading" : "Notes shown under the video"}
            rows={lesson.kind === "READING" ? 10 : 3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            help={lesson.kind === "READING" ? "Supports ## headings, - lists, **bold**, *italic* and `code`." : undefined}
          />
        )}
        <Switch label="Free preview" description="Anyone in your organization can open this lesson before enrolling." checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        {lesson.kind === "VIDEO" && (
          <section>
            <div className="ob-label mb-2">Video</div>
            <VideoSettings lessonId={lesson.id} />
          </section>
        )}
        {lesson.kind === "QUIZ" && (
          <section>
            <div className="ob-label mb-2">Questions</div>
            <QuizSettings lessonId={lesson.id} />
          </section>
        )}
        {lesson.kind === "ASSIGNMENT" && (
          <section>
            <div className="ob-label mb-2">Assignment</div>
            <AssignmentSettings lessonId={lesson.id} />
          </section>
        )}
      </div>
    </Dialog>
  );
}
