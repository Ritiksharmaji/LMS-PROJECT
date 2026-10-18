"use client";

import { useQuery } from "@tanstack/react-query";

import { Icon, IconButton, Skeleton, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { ResourceView } from "@/lib/types";

export function useResources(courseId: string) {
  return useQuery({ queryKey: ["resources", courseId], queryFn: () => api.get<ResourceView[]>(`/me/courses/${courseId}/resources`) });
}

/** Files and links for the current lesson plus course-wide ones. */
export function LessonResources({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const toast = useToast();
  const resources = useResources(courseId);
  if (resources.isLoading) return <Skeleton height={80} />;
  const list = (resources.data ?? []).filter((r) => !r.lessonId || r.lessonId === lessonId);
  if (!list.length) return <p style={{ margin: 0, color: "var(--text-muted)" }}>No resources for this lesson.</p>;
  const open = async (r: ResourceView) => {
    if (r.url) return window.open(r.url, "_blank", "noopener");
    try {
      const link = await api.get<{ url: string }>(`/me/files/${r.fileId}/download`);
      window.open(link.url, "_blank", "noopener");
      toast({ tone: "info", title: "Download started", message: r.title });
    } catch (e) {
      toast({ tone: "danger", title: "Couldn't download", message: e instanceof Error ? e.message : undefined });
    }
  };
  return (
    <div>
      {list.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5" style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name={r.kind === "LINK" ? "link" : "paperclip"} size={16} />
          {r.title}
          {r.sizeBytes ? <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{bytes(r.sizeBytes)}</span> : null}
          <span className="flex-1" />
          <IconButton icon={r.kind === "LINK" ? "external-link" : "download"} label={r.kind === "LINK" ? "Open link" : "Download"} size="sm" onClick={() => open(r)} />
        </div>
      ))}
    </div>
  );
}
