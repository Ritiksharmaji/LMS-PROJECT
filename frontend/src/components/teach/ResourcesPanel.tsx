"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useResources } from "@/components/learn/player/LessonResources";
import { Button, Card, EmptyState, Icon, IconButton, Input, ProgressBar, Select, Skeleton, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { CourseEditorView } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

export function ResourcesPanel({ editor }: { editor: CourseEditorView }) {
  const qc = useQueryClient();
  const toast = useToast();
  const courseId = editor.course.id;
  const resources = useResources(courseId);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["resources", courseId] });
  const add = useMutation({
    mutationFn: (body: { title: string; url?: string; fileId?: string }) => api.post(`/instructor/courses/${courseId}/resources`, { ...body, lessonId: lessonId || undefined }),
    onSuccess: () => {
      setTitle("");
      setUrl("");
      refresh();
      toast({ title: "Resource added" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't add resource", message: e.message }),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/instructor/resources/${id}`), onSuccess: refresh });
  const lessons = editor.sections.flatMap((s) => s.lessons.map((l) => ({ value: l.id, label: `${s.title} · ${l.title}` })));
  const file = async (f: File | undefined) => {
    if (!f) return;
    setProgress(0);
    try {
      const up = await uploadFile(f, "RESOURCE", courseId, setProgress);
      add.mutate({ title: title.trim() || f.name, fileId: up.id });
    } catch (e) {
      toast({ tone: "danger", title: "Upload failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setProgress(null);
    }
  };
  return (
    <div className="grid max-w-[980px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card title="Resources" padding="8px 20px 14px">
        {resources.isLoading ? (
          <Skeleton height={100} />
        ) : !resources.data?.length ? (
          <EmptyState icon="paperclip" title="No resources yet" message="Slides, notebooks, datasets and links for learners." />
        ) : (
          resources.data.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5" style={{ padding: "10px 0", borderTop: "1px solid var(--border-subtle)" }}>
              <Icon name={r.kind === "LINK" ? "link" : "paperclip"} size={16} />
              <div className="min-w-0 flex-1">
                <div style={{ color: "var(--text-strong)", fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {r.lessonId ? lessons.find((l) => l.value === r.lessonId)?.label ?? "Lesson" : "Whole course"}
                  {r.sizeBytes ? ` · ${bytes(r.sizeBytes)}` : ""}
                </div>
              </div>
              <IconButton icon="trash-2" label="Remove resource" size="sm" onClick={() => remove.mutate(r.id)} />
            </div>
          ))
        )}
      </Card>
      <Card title="Add a resource">
        <div className="flex flex-col gap-3.5">
          <Input label="Title" placeholder="e.g. Lesson slides (PDF)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select label="Attach to" value={lessonId} onChange={(e) => setLessonId(e.target.value)} options={[{ value: "", label: "Whole course" }, ...lessons]} />
          <label className="ob-btn ob-btn--secondary ob-btn--md" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={18} />
            Upload a file
            <input type="file" style={{ display: "none" }} onChange={(e) => file(e.target.files?.[0])} />
          </label>
          {progress != null && <ProgressBar value={progress} showValue label="Uploading" />}
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-subtle)" }}>or</div>
          <Input label="Link" iconLeft="link" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button variant="secondary" disabled={!title.trim() || !url.trim()} loading={add.isPending} onClick={() => add.mutate({ title, url })}>
            Add link
          </Button>
        </div>
      </Card>
    </div>
  );
}
