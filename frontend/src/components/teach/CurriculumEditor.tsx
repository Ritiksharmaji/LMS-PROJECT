"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Badge, Button, Card, Dialog, EmptyState, Icon, IconButton, Input, Select, useToast, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import type { CourseEditorView, LessonKind, LessonView, SectionView } from "@/lib/types";

import { LessonEditor } from "./LessonEditor";

const KIND_ICON: Record<LessonKind, IconName> = { VIDEO: "play", READING: "file-text", QUIZ: "circle-help", ASSIGNMENT: "clipboard-check" };
const KIND_LABEL: Record<LessonKind, string> = { VIDEO: "Video", READING: "Reading", QUIZ: "Quiz", ASSIGNMENT: "Assignment" };

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function AddLesson({ section, onAdded }: { section: SectionView; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<LessonKind>("VIDEO");
  const add = useMutation({
    mutationFn: () => api.post(`/instructor/sections/${section.id}/lessons`, { title, kind, durationMinutes: kind === "VIDEO" || kind === "READING" ? 10 : 0 }),
    onSuccess: () => {
      setTitle("");
      onAdded();
    },
  });
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      style={{ padding: "8px 12px 4px" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) add.mutate();
      }}
    >
      <Input size="sm" placeholder="New lesson title" value={title} onChange={(e) => setTitle(e.target.value)} containerStyle={{ flex: 1, minWidth: 200 }} aria-label="New lesson title" />
      <Select size="sm" aria-label="Lesson type" value={kind} onChange={(e) => setKind(e.target.value as LessonKind)} options={(Object.keys(KIND_LABEL) as LessonKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
      <Button size="sm" variant="secondary" iconLeft="plus" type="submit" loading={add.isPending} disabled={!title.trim()}>
        Add lesson
      </Button>
    </form>
  );
}

export function CurriculumEditor({ editor, onChanged }: { editor: CourseEditorView; onChanged: () => void }) {
  const toast = useToast();
  const courseId = editor.course.id;
  const [newSection, setNewSection] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "section" | "lesson"; id: string; title: string } | null>(null);
  const onError = (e: Error) => toast({ tone: "danger", title: "Couldn't save", message: e.message });

  const addSection = useMutation({
    mutationFn: () => api.post(`/instructor/courses/${courseId}/sections`, { title: newSection }),
    onSuccess: () => {
      setNewSection("");
      onChanged();
    },
    onError,
  });
  const rename = useMutation({
    mutationFn: (r: { id: string; title: string }) => api.patch(`/instructor/sections/${r.id}`, { title: r.title }),
    onSuccess: () => {
      setRenaming(null);
      onChanged();
    },
    onError,
  });
  const reorder = useMutation({
    mutationFn: (sections: SectionView[]) => api.put(`/instructor/courses/${courseId}/order`, { sections: sections.map((s) => ({ id: s.id, lessonIds: s.lessons.map((l) => l.id) })) }),
    onSuccess: onChanged,
    onError,
  });
  const remove = useMutation({
    mutationFn: (d: { kind: "section" | "lesson"; id: string }) => api.delete(`/instructor/${d.kind === "section" ? "sections" : "lessons"}/${d.id}`),
    onSuccess: () => {
      setDeleting(null);
      onChanged();
    },
    onError,
  });

  const sections = editor.sections;
  const moveSection = (i: number, d: -1 | 1) => reorder.mutate(move(sections, i, i + d));
  const moveLesson = (si: number, li: number, d: -1 | 1) => {
    const s = sections[si];
    // Moving past the edge of a section moves the lesson into the neighbouring section.
    if ((li + d < 0 && si > 0) || (li + d >= s.lessons.length && si < sections.length - 1)) {
      const target = si + d;
      const next = sections.map((x) => ({ ...x, lessons: [...x.lessons] }));
      const [lesson] = next[si].lessons.splice(li, 1);
      if (d < 0) next[target].lessons.push(lesson);
      else next[target].lessons.unshift(lesson);
      return reorder.mutate(next);
    }
    if (li + d < 0 || li + d >= s.lessons.length) return;
    reorder.mutate(sections.map((x, j) => (j === si ? { ...x, lessons: move(x.lessons, li, li + d) } : x)));
  };

  return (
    <div className="flex max-w-[880px] flex-col gap-4">
      {sections.length === 0 && <EmptyState icon="list" title="No sections yet" message="Group lessons into sections, e.g. “Foundations”, “Core skills”, “Apply it”." />}
      {sections.map((s, si) => (
        <Card key={s.id} padding="8px">
          <div className="flex items-center gap-2" style={{ padding: "8px 12px" }}>
            {renaming?.id === s.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  rename.mutate(renaming);
                }}
              >
                <Input size="sm" autoFocus value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} containerStyle={{ flex: 1 }} aria-label="Section title" />
                <Button size="sm" type="submit" loading={rename.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <span className="flex-1" style={{ font: "600 15px var(--font-display)", color: "var(--text-strong)" }}>
                  {si + 1}. {s.title}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.lessons.length} lessons</span>
                <IconButton icon="chevron-up" label="Move section up" size="sm" disabled={si === 0 || reorder.isPending} onClick={() => moveSection(si, -1)} />
                <IconButton icon="chevron-down" label="Move section down" size="sm" disabled={si === sections.length - 1 || reorder.isPending} onClick={() => moveSection(si, 1)} />
                <IconButton icon="pencil" label="Rename section" size="sm" onClick={() => setRenaming({ id: s.id, title: s.title })} />
                <IconButton icon="trash-2" label="Delete section" size="sm" onClick={() => setDeleting({ kind: "section", id: s.id, title: s.title })} />
              </>
            )}
          </div>
          {s.lessons.map((l, li) => (
            <div key={l.id} className="ob-lesson" style={{ cursor: "default" }}>
              <span className="ob-lesson__state" style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                <Icon name={KIND_ICON[l.kind]} size={14} />
              </span>
              <button type="button" onClick={() => setEditing(l)} className="min-w-0 flex-1 text-left" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                <div className="ob-lesson__title">
                  <span style={{ color: "var(--text-subtle)", marginRight: 6 }}>{li + 1}.</span>
                  {l.title}
                </div>
                <div className="ob-lesson__meta">
                  {KIND_LABEL[l.kind]}
                  {l.durationMinutes ? ` · ${l.durationMinutes} min` : ""}
                </div>
              </button>
              {l.preview && <Badge tone="info">Free preview</Badge>}
              <IconButton icon="chevron-up" label="Move lesson up" size="sm" disabled={(si === 0 && li === 0) || reorder.isPending} onClick={() => moveLesson(si, li, -1)} />
              <IconButton icon="chevron-down" label="Move lesson down" size="sm" disabled={(si === sections.length - 1 && li === s.lessons.length - 1) || reorder.isPending} onClick={() => moveLesson(si, li, 1)} />
              <IconButton icon="pencil" label="Edit lesson" size="sm" onClick={() => setEditing(l)} />
              <IconButton icon="trash-2" label="Delete lesson" size="sm" onClick={() => setDeleting({ kind: "lesson", id: l.id, title: l.title })} />
            </div>
          ))}
          <AddLesson section={s} onAdded={onChanged} />
        </Card>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newSection.trim()) addSection.mutate();
        }}
      >
        <Input placeholder="New section, e.g. Foundations" value={newSection} onChange={(e) => setNewSection(e.target.value)} containerStyle={{ flex: 1 }} aria-label="New section title" />
        <Button type="submit" iconLeft="plus" loading={addSection.isPending} disabled={!newSection.trim()}>
          Add section
        </Button>
      </form>
      {editing && <LessonEditor lesson={editing} courseId={courseId} onClose={() => setEditing(null)} onSaved={onChanged} />}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        icon="trash-2"
        iconTone="danger"
        title={`Delete “${deleting?.title}”?`}
        description={deleting?.kind === "section" ? "Its lessons and their learner progress are deleted too." : "Learner progress, quiz attempts and submissions for this lesson are deleted too."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
