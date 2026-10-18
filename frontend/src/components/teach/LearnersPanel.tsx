"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Avatar, Badge, Button, Card, Dialog, EmptyState, IconButton, Input, ProgressBar, RelativeTime, Skeleton, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/queries";
import type { CourseEditorView, LearnerView, MemberView, Page } from "@/lib/types";

function AssignDialog({ courseId, open, onClose, onDone, enrolled }: { courseId: string; open: boolean; onClose: () => void; onDone: () => void; enrolled: Set<string> }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const members = useQuery({
    queryKey: ["members-search", q],
    queryFn: () => api.get<Page<MemberView>>(`/admin/members?size=30&q=${encodeURIComponent(q)}`),
    enabled: open,
  });
  const assign = useMutation({
    mutationFn: () => api.post<{ enrolled: number }>(`/instructor/courses/${courseId}/learners`, { userIds: [...picked] }),
    onSuccess: (r) => {
      toast({ title: `${r.enrolled} enrolled`, message: "They've been notified." });
      setPicked(new Set());
      onDone();
      onClose();
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't enroll", message: e.message }),
  });
  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon="user-plus"
      iconTone="orbit"
      width={520}
      title="Enroll learners"
      description="Assigned learners get the course free of charge."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!picked.size} loading={assign.isPending} onClick={() => assign.mutate()}>
            Enroll {picked.size || ""}
          </Button>
        </>
      }
    >
      <Input iconLeft="search" size="sm" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
      <div className="mt-3 flex max-h-[320px] flex-col overflow-y-auto">
        {members.isLoading && <Skeleton height={120} />}
        {members.data?.items.filter((m) => m.status === "ACTIVE").map((m) => {
          const already = enrolled.has(m.userId);
          return (
            <label key={m.id} className="flex items-center gap-3" style={{ padding: "8px 4px", cursor: already ? "default" : "pointer", opacity: already ? 0.5 : 1 }}>
              <input type="checkbox" disabled={already} checked={already || picked.has(m.userId)} onChange={() => toggle(m.userId)} />
              <Avatar src={m.avatarUrl} name={m.fullName} size={28} />
              <span className="flex-1">
                <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>{m.fullName}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>{m.email}</span>
              </span>
              {already && <Badge>Enrolled</Badge>}
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}

export function LearnersPanel({ editor, onChanged }: { editor: CourseEditorView; onChanged: () => void }) {
  const me = useMe();
  const courseId = editor.course.id;
  const [assigning, setAssigning] = useState(false);
  const learners = useQuery({ queryKey: ["learners", courseId], queryFn: () => api.get<Page<LearnerView>>(`/instructor/courses/${courseId}/learners?size=100`) });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/instructor/enrollments/${id}`),
    onSuccess: () => {
      learners.refetch();
      onChanged();
    },
  });
  const list = learners.data?.items ?? [];
  const isAdmin = me.data?.role === "ADMIN";
  return (
    <div className="max-w-[980px]">
      <div className="mb-4 flex items-center justify-between">
        <span style={{ color: "var(--text-muted)" }}>{learners.data ? `${learners.data.total} learners` : " "}</span>
        {isAdmin && editor.course.status !== "DRAFT" && (
          <Button iconLeft="user-plus" onClick={() => setAssigning(true)}>
            Enroll learners
          </Button>
        )}
      </div>
      {learners.isLoading ? (
        <Skeleton height={200} />
      ) : !list.length ? (
        <EmptyState icon="users" title="No learners yet" message={editor.course.status === "DRAFT" ? "Publish the course so people can enroll." : "Share the course page, or enroll people directly."} />
      ) : (
        <Card padding={0} style={{ overflowX: "auto" }}>
          <table className="ob-table">
            <thead>
              <tr>
                <th>Learner</th>
                <th style={{ width: 200 }}>Progress</th>
                <th>Joined</th>
                <th>Last active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.enrollmentId}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar src={l.avatarUrl} name={l.fullName} size={30} />
                      <div>
                        <div style={{ color: "var(--text-strong)", fontWeight: 600 }}>{l.fullName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.email}</div>
                      </div>
                      {l.source === "ASSIGNED" && <Badge tone="info">Assigned</Badge>}
                      {l.status === "COMPLETED" && <Badge tone="success" dot>Completed</Badge>}
                    </div>
                  </td>
                  <td>
                    <ProgressBar value={l.progress.percent} showValue color={l.progress.percent >= 100 ? "var(--success)" : undefined} />
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    <RelativeTime iso={l.enrolledAt} />
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    <RelativeTime iso={l.lastAccessedAt} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <IconButton icon="trash-2" label={`Remove ${l.fullName}`} size="sm" onClick={() => confirm(`Remove ${l.fullName} from this course?`) && remove.mutate(l.enrollmentId)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {isAdmin && <AssignDialog courseId={courseId} open={assigning} onClose={() => setAssigning(false)} onDone={() => { learners.refetch(); onChanged(); }} enrolled={new Set(list.map((l) => l.userId))} />}
    </div>
  );
}
