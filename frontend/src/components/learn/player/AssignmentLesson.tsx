"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Badge, Button, Card, Dialog, ErrorState, Icon, Input, ProgressBar, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { bytes, dateTime, due } from "@/lib/format";
import type { AssignmentView, FileView, SubmissionView } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

import { Markdown } from "./Markdown";

export function AssignmentLesson({ lessonId, courseId, title, onSubmitted }: { lessonId: string; courseId: string; title: string; onSubmitted: () => void }) {
  const qc = useQueryClient();
  const assignment = useQuery({ queryKey: ["assignment", lessonId], queryFn: () => api.get<AssignmentView>(`/me/lessons/${lessonId}/assignment`) });
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<FileView | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [confirm, setConfirm] = useState(false);

  const submit = useMutation({
    mutationFn: () => api.post<SubmissionView>(`/me/lessons/${lessonId}/assignment/submission`, { body, linkUrl: link || undefined, fileId: file?.id }),
    onSuccess: () => {
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ["assignment", lessonId] });
      onSubmitted();
    },
  });

  if (assignment.isLoading) return <Skeleton height={320} />;
  if (assignment.error || !assignment.data) return <ErrorState message={assignment.error?.message ?? "This assignment isn't ready yet."} />;
  const a = assignment.data;
  const s = a.submission;
  const canSubmit = !s || s.status === "RETURNED";
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setUploadError(null);
    setProgress(0);
    try {
      setFile(await uploadFile(f, "SUBMISSION", courseId, setProgress));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };
  const dueBadge = a.dueAt ? due(a.dueAt) : null;
  const status = !s
    ? dueBadge && <Badge tone={dueBadge.tone === "neutral" ? "warning" : dueBadge.tone} dot>{dueBadge.label === "Overdue" ? "Overdue" : `Due ${dateTime(a.dueAt)}`}</Badge>
    : s.status === "GRADED"
      ? <Badge tone="success" dot>Graded · {s.points}/{s.maxPoints}</Badge>
      : s.status === "RETURNED"
        ? <Badge tone="warning" dot>Returned for revision</Badge>
        : <Badge tone="success" dot>Submitted{s.late ? " late" : ""}</Badge>;

  return (
    <Card padding={28}>
      {status}
      <div style={{ font: "600 20px var(--font-display)", color: "var(--text-strong)", margin: "12px 0 6px" }}>{title}</div>
      {a.instructions && <Markdown text={a.instructions} />}
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
        Worth {a.maxPoints} points{a.allowLate ? "" : " · late work isn't accepted"}
      </div>

      {s && s.feedback && (
        <div style={{ padding: 16, borderRadius: 14, background: s.status === "GRADED" ? "var(--success-soft)" : "var(--warning-soft)", marginBottom: 18 }}>
          <div style={{ font: "600 13px var(--font-body)", color: "var(--text-strong)", marginBottom: 4 }}>Feedback from your instructor</div>
          <div style={{ whiteSpace: "pre-line" }}>{s.feedback}</div>
        </div>
      )}

      {s && !canSubmit && (
        <div className="flex flex-col gap-2" style={{ padding: 16, borderRadius: 14, background: "var(--paper-50)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ font: "600 13px var(--font-body)", color: "var(--text-strong)" }}>Your submission · {dateTime(s.submittedAt)}</div>
          {s.fileName && (
            <SubmissionFile id={s.fileId} name={s.fileName} />
          )}
          {s.linkUrl && (
            <a href={s.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
              <Icon name="link" size={16} />
              {s.linkUrl}
            </a>
          )}
          {s.body && <div style={{ whiteSpace: "pre-line" }}>{s.body}</div>}
        </div>
      )}

      {canSubmit && (
        <div className="flex flex-col gap-4">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0]);
            }}
            style={{ display: "grid", placeItems: "center", gap: 6, padding: 28, borderRadius: 14, border: "1.5px dashed var(--border-strong)", background: "var(--paper-50)", cursor: "pointer", textAlign: "center" }}
          >
            <Icon name={file ? "file-check" : "upload"} size={26} color={file ? "var(--success)" : "var(--ink-500)"} />
            <span style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{file ? file.fileName : "Click to choose a file"}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{file ? bytes(file.sizeBytes) : "PDF, IPYNB, ZIP, documents or images · up to 50 MB"}</span>
            <input ref={input} type="file" style={{ display: "none" }} onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {progress != null && <ProgressBar value={progress} showValue label="Uploading" />}
          {uploadError && <div className="ob-help ob-help--error">{uploadError}</div>}
          <Input label="Link (optional)" iconLeft="link" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
          <Textarea label="Notes on your approach (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
          <div>
            <Button iconLeft="send" disabled={!file && !link && !body.trim()} onClick={() => setConfirm(true)}>
              {s?.status === "RETURNED" ? "Resubmit assignment" : "Submit assignment"}
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        icon="send"
        title="Submit assignment?"
        description="You won’t be able to edit your submission afterwards."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button iconLeft="send" loading={submit.isPending} onClick={() => submit.mutate()}>
              Submit
            </Button>
          </>
        }
      >
        {submit.error && <div className="ob-help ob-help--error">{submit.error.message}</div>}
      </Dialog>
    </Card>
  );
}

function SubmissionFile({ id, name }: { id: string | null; name: string }) {
  const open = async () => {
    if (!id) return;
    const link = await api.get<{ url: string }>(`/me/files/${id}/download`);
    window.open(link.url, "_blank", "noopener");
  };
  return (
    <button type="button" onClick={open} className="flex items-center gap-2" style={{ background: "none", border: 0, padding: 0, color: "var(--text-accent)", cursor: "pointer", font: "inherit" }}>
      <Icon name="paperclip" size={16} />
      {name}
    </button>
  );
}
