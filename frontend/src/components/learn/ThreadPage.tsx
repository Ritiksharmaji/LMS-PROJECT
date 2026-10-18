"use client";

import { useQuery } from "@tanstack/react-query";

import { Avatar, Badge, Button, Card, ErrorState, PageHead, RelativeTime, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { playerHref } from "@/lib/course";
import type { ThreadDetail } from "@/lib/types";

import { ThreadView } from "./Discussion";

export function ThreadPage({ threadId }: { threadId: string }) {
  const thread = useQuery({ queryKey: ["thread", threadId], queryFn: () => api.get<ThreadDetail>(`/me/threads/${threadId}`) });
  if (thread.error) return <ErrorState message={thread.error.message} />;
  if (!thread.data) return <Skeleton height={300} />;
  const t = thread.data.thread;
  return (
    <div className="max-w-[760px]">
      <PageHead
        overline="Discussion"
        title={t.title ?? "Question"}
        actions={
          <Button variant="secondary" iconLeft="arrow-left" href={playerHref(t.courseId, t.lessonId)}>
            Back to the lesson
          </Button>
        }
      />
      <Card padding={24}>
        <div className="mb-4 flex gap-3">
          <Avatar src={t.author?.avatarUrl} name={t.author?.fullName} size={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <b style={{ color: "var(--text-strong)" }}>{t.author?.fullName}</b>
              {t.author?.staff && <Badge tone="orbit">Instructor</Badge>}
              <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>
                <RelativeTime iso={t.createdAt} />
              </span>
            </div>
            <div style={{ whiteSpace: "pre-line", marginTop: 4 }}>{t.body}</div>
          </div>
        </div>
        <ThreadView threadId={threadId} />
      </Card>
    </div>
  );
}
