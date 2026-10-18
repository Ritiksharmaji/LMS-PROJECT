"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Dialog, ErrorState, Icon, PageHead, Skeleton, Tabs, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { CourseEditorView } from "@/lib/types";

import { CurriculumEditor } from "./CurriculumEditor";
import { DetailsForm } from "./DetailsForm";
import { LearnersPanel } from "./LearnersPanel";
import { ResourcesPanel } from "./ResourcesPanel";

type Tab = "details" | "curriculum" | "resources" | "learners";

export function useCourseEditor(courseId: string) {
  return useQuery({ queryKey: ["course-editor", courseId], queryFn: () => api.get<CourseEditorView>(`/instructor/courses/${courseId}`) });
}

export function CourseEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const editor = useCourseEditor(courseId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tab = (params.get("tab") as Tab) ?? "details";
  const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["course-editor", courseId] });
    qc.invalidateQueries({ queryKey: ["instructor-courses"] });
    qc.invalidateQueries({ queryKey: ["instructor-overview"] });
  };
  const publish = useMutation({
    mutationFn: () => api.post<CourseEditorView>(`/instructor/courses/${courseId}/publish`),
    onSuccess: () => {
      refresh();
      toast({ title: "Course published", message: "It's now in the catalog." });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't publish", message: e.message }),
  });
  const archive = useMutation({
    mutationFn: () => api.post<CourseEditorView>(`/instructor/courses/${courseId}/archive`),
    onSuccess: () => {
      refresh();
      toast({ tone: "info", title: "Course archived", message: "Hidden from the catalog; learners keep access." });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/instructor/courses/${courseId}`),
    onSuccess: () => {
      refresh();
      router.replace("/teach/courses");
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't delete", message: e.message }),
  });

  if (editor.error) return <ErrorState message={editor.error.message} onRetry={() => editor.refetch()} />;
  if (!editor.data) return <Skeleton height={480} />;
  const e = editor.data;
  const c = e.course;
  const lessons = e.sections.reduce((a, s) => a + s.lessons.length, 0);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        <Link href="/teach/courses">My courses</Link>
        <Icon name="chevron-right" size={14} />
        <span style={{ color: "var(--text-strong)" }}>{c.title}</span>
      </div>
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.title}
            <Badge tone={c.status === "PUBLISHED" ? "success" : c.status === "DRAFT" ? "neutral" : "warning"} dot>
              {c.status === "PUBLISHED" ? "Live" : c.status === "DRAFT" ? "Draft" : "Archived"}
            </Badge>
          </span>
        }
        sub={`${lessons} lessons · ${c.enrollmentCount} learners`}
        actions={
          <>
            {c.status === "PUBLISHED" && (
              <Button variant="secondary" iconLeft="external-link" href={`/courses/${c.slug}`} target="_blank">
                View in catalog
              </Button>
            )}
            {c.status === "PUBLISHED" && <Button variant="ghost" iconLeft="clipboard-check" href={`/teach/grading?course=${courseId}`}>Gradebook</Button>}
            {c.status === "DRAFT" && c.enrollmentCount === 0 && (
              <Button variant="ghost" iconLeft="trash-2" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            {c.status === "PUBLISHED" ? (
              <Button variant="secondary" iconLeft="ban" loading={archive.isPending} onClick={() => archive.mutate()}>
                Archive
              </Button>
            ) : (
              <Button iconLeft="send" loading={publish.isPending} onClick={() => publish.mutate()} disabled={lessons === 0} title={lessons === 0 ? "Add a lesson first" : undefined}>
                {c.status === "ARCHIVED" ? "Republish" : "Publish"}
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { label: "Details", value: "details" },
          { label: "Curriculum", value: "curriculum", count: lessons },
          { label: "Resources", value: "resources" },
          { label: "Learners", value: "learners", count: c.enrollmentCount },
        ]}
        style={{ marginBottom: 22 }}
      />
      {tab === "details" && <DetailsForm editor={e} onSaved={refresh} />}
      {tab === "curriculum" && <CurriculumEditor editor={e} onChanged={refresh} />}
      {tab === "resources" && <ResourcesPanel editor={e} />}
      {tab === "learners" && <LearnersPanel editor={e} onChanged={refresh} />}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="trash-2"
        iconTone="danger"
        title="Delete this draft?"
        description="Its sections, lessons, quizzes and assignments are removed. This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete draft
            </Button>
          </>
        }
      />
    </div>
  );
}
