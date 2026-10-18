"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Avatar, Badge, Button, Icon, Input, RelativeTime, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/queries";
import type { Author, Page, ReplyView, ThreadDetail, ThreadSummary } from "@/lib/types";

function Byline({ author, at, edited }: { author: Author | null; at: string; edited?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <b style={{ color: "var(--text-strong)" }}>{author?.fullName ?? "Someone"}</b>
      {author?.staff && <Badge tone="orbit">Instructor</Badge>}
      <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>
        <RelativeTime iso={at} />
        {edited && " · edited"}
      </span>
    </div>
  );
}

/** One thread with its replies, inline. Also used by the thread page. */
export function ThreadView({ threadId, courseStaff }: { threadId: string; courseStaff?: boolean }) {
  const qc = useQueryClient();
  const me = useMe();
  const thread = useQuery({ queryKey: ["thread", threadId], queryFn: () => api.get<ThreadDetail>(`/me/threads/${threadId}`) });
  const [reply, setReply] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["thread", threadId] });
    qc.invalidateQueries({ queryKey: ["threads"] });
  };
  const send = useMutation({ mutationFn: () => api.post<ReplyView>(`/me/threads/${threadId}/replies`, { body: reply }), onSuccess: () => { setReply(""); refresh(); } });
  const answer = useMutation({ mutationFn: (r: ReplyView) => (r.answer ? api.delete(`/me/replies/${r.id}/answer`) : api.put(`/me/replies/${r.id}/answer`)), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (r: ReplyView) => api.delete(`/me/replies/${r.id}`), onSuccess: refresh });
  if (thread.isLoading) return <Skeleton height={80} />;
  if (!thread.data) return null;
  const t = thread.data.thread;
  const mine = me.data?.user.id === t.author?.id;
  return (
    <div className="flex flex-col gap-3.5" style={{ paddingLeft: 48 }}>
      {thread.data.replies.map((r) => (
        <div key={r.id} className="flex gap-3">
          <Avatar src={r.author?.avatarUrl} name={r.author?.fullName} size={30} />
          <div className="min-w-0 flex-1">
            <Byline author={r.author} at={r.createdAt} edited={r.editedAt} />
            <div style={{ whiteSpace: "pre-line", color: r.deleted ? "var(--text-subtle)" : undefined }}>{r.body}</div>
            {r.answer && (
              <Badge tone="success" dot style={{ marginTop: 6 }}>
                Accepted answer
              </Badge>
            )}
            {!r.deleted && (
              <div className="mt-1 flex gap-3" style={{ fontSize: 12 }}>
                {(mine || courseStaff) && (
                  <button type="button" onClick={() => answer.mutate(r)} style={{ background: "none", border: 0, padding: 0, color: "var(--text-muted)", cursor: "pointer" }}>
                    {r.answer ? "Unmark answer" : "Mark as answer"}
                  </button>
                )}
                {(me.data?.user.id === r.author?.id || courseStaff) && (
                  <button type="button" onClick={() => remove.mutate(r)} style={{ background: "none", border: 0, padding: 0, color: "var(--text-muted)", cursor: "pointer" }}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <form
        className="flex gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim()) send.mutate();
        }}
      >
        <Input size="sm" placeholder="Write a reply" value={reply} onChange={(e) => setReply(e.target.value)} containerStyle={{ flex: 1 }} aria-label="Write a reply" />
        <Button size="sm" type="submit" loading={send.isPending} disabled={!reply.trim()}>
          Reply
        </Button>
      </form>
    </div>
  );
}

/** Course (or lesson) discussion from the design: ask box on top, posts below, replies expand inline. */
export function Discussion({ courseId, lessonId, courseStaff }: { courseId: string; lessonId?: string; courseStaff?: boolean }) {
  const qc = useQueryClient();
  const me = useMe();
  const [text, setText] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const key = ["threads", courseId, lessonId ?? "all"];
  const threads = useQuery({
    queryKey: key,
    queryFn: () => api.get<Page<ThreadSummary>>(`/me/courses/${courseId}/threads?size=30${lessonId ? `&lessonId=${lessonId}` : ""}`),
  });
  const post = useMutation({
    mutationFn: () => api.post<ThreadDetail>(`/me/courses/${courseId}/threads`, { body: text, lessonId }),
    onSuccess: (d) => {
      setText("");
      setOpen(d.thread.id);
      qc.invalidateQueries({ queryKey: ["threads", courseId] });
    },
  });
  const pin = useMutation({
    mutationFn: (t: ThreadSummary) => (t.pinned ? api.delete(`/me/threads/${t.id}/pinned`) : api.put(`/me/threads/${t.id}/pinned`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads", courseId] }),
  });
  return (
    <div className="flex flex-col gap-[18px]">
      <form
        className="flex items-start gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) post.mutate();
        }}
      >
        <Avatar src={me.data?.user.avatarUrl} name={me.data?.user.fullName} size={36} />
        <Textarea placeholder="Ask a question or share a tip" value={text} onChange={(e) => setText(e.target.value)} containerStyle={{ flex: 1 }} style={{ minHeight: 44 }} aria-label="Ask a question or share a tip" />
        <Button type="submit" loading={post.isPending} disabled={!text.trim()}>
          Post
        </Button>
      </form>
      {threads.isLoading && <Skeleton height={100} />}
      {threads.data?.items.length === 0 && <p style={{ margin: 0, color: "var(--text-muted)" }}>No questions yet. Be the first to ask.</p>}
      {threads.data?.items.map((t) => (
        <div key={t.id} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Avatar src={t.author?.avatarUrl} name={t.author?.fullName} size={36} />
            <div className="min-w-0 flex-1">
              <Byline author={t.author} at={t.createdAt} edited={t.editedAt} />
              {t.title && <div style={{ font: "600 15px var(--font-body)", color: "var(--text-strong)", marginTop: 2 }}>{t.title}</div>}
              <div style={{ whiteSpace: "pre-line" }}>{t.body}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3" style={{ fontSize: 13 }}>
                {t.pinned && <Badge tone="accent">Pinned</Badge>}
                {t.resolved && <Badge tone="success" dot>Answered</Badge>}
                <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} className="flex items-center gap-1" style={{ background: "none", border: 0, padding: 0, color: "var(--text-accent)", cursor: "pointer", fontWeight: 600 }}>
                  <Icon name="message-square" size={14} />
                  {t.replyCount ? `${t.replyCount} ${t.replyCount === 1 ? "reply" : "replies"}` : "Reply"}
                </button>
                {courseStaff && (
                  <button type="button" onClick={() => pin.mutate(t)} style={{ background: "none", border: 0, padding: 0, color: "var(--text-muted)", cursor: "pointer" }}>
                    {t.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
              </div>
            </div>
          </div>
          {open === t.id && <ThreadView threadId={t.id} courseStaff={courseStaff} />}
        </div>
      ))}
    </div>
  );
}
