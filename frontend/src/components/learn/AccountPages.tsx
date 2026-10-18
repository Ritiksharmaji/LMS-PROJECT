"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, Badge, Button, Card, Dialog, EmptyState, ErrorState, Icon, Input, PageHead, RelativeTime, Skeleton, Switch, Tabs, useNow, useToast, type BadgeTone } from "@/components/ui";
import { api } from "@/lib/api";
import { playerHref } from "@/lib/course";
import { date, price, role as roleLabel, time } from "@/lib/format";
import { useMe } from "@/lib/queries";
import type { MembershipView, MyGrade, NotificationView, OrderView, Page, SessionView } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

// ---- Schedule -----------------------------------------------------------------------------------

const KIND_LABEL: Record<SessionView["kind"], string> = { LIVE_CLASS: "Live class", OFFICE_HOURS: "Office hours", STUDY_GROUP: "Study group", WORKSHOP: "Workshop" };

export function SessionList({ sessions, empty }: { sessions: SessionView[]; empty: string }) {
  if (!sessions.length) return <EmptyState icon="calendar" title={empty} />;
  const byDay = new Map<string, SessionView[]>();
  for (const s of sessions) {
    const day = new Date(s.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  return (
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
                  <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)", textDecoration: s.cancelled ? "line-through" : undefined }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {s.courseTitle} · {KIND_LABEL[s.kind]}
                    {s.hostName ? ` · ${s.hostName}` : ""}
                    {s.location ? ` · ${s.location}` : ""}
                  </div>
                </div>
                {s.cancelled ? (
                  <Badge tone="danger">Cancelled</Badge>
                ) : s.meetingUrl ? (
                  <Button size="sm" variant="secondary" iconLeft="video" href={s.meetingUrl} target="_blank" rel="noreferrer">
                    Join
                  </Button>
                ) : null}
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

export function SchedulePage() {
  const now = useNow();
  const sessions = useQuery({
    queryKey: ["schedule", "upcoming"],
    queryFn: () => {
      const from = new Date(now!);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + 30 * 86_400_000);
      return api.get<SessionView[]>(`/me/schedule?from=${from.toISOString()}&to=${to.toISOString()}`);
    },
    enabled: now != null,
  });
  return (
    <div className="max-w-[880px]">
      <PageHead title="Schedule" sub="Live sessions for your courses over the next 30 days" />
      {sessions.error ? <ErrorState message={sessions.error.message} /> : sessions.data ? <SessionList sessions={sessions.data} empty="No sessions scheduled" /> : <Skeleton height={240} />}
    </div>
  );
}

// ---- Grades -------------------------------------------------------------------------------------

const GRADE_TONE: Record<string, BadgeTone> = { PASSED: "success", GRADED: "success", NOT_PASSED: "warning", SUBMITTED: "info", RETURNED: "warning" };
const GRADE_LABEL: Record<string, string> = { PASSED: "Passed", NOT_PASSED: "Not passed yet", GRADED: "Graded", SUBMITTED: "Awaiting grade", RETURNED: "Returned" };

export function GradesPage() {
  const grades = useQuery({ queryKey: ["grades"], queryFn: () => api.get<MyGrade[]>("/me/grades") });
  const list = grades.data ?? [];
  const graded = list.filter((g) => g.percent != null);
  const avg = graded.length ? Math.round(graded.reduce((a, g) => a + (g.percent ?? 0), 0) / graded.length) : null;
  return (
    <div>
      <PageHead title="Grades" sub={avg == null ? "Quiz results and graded assignments" : `Average ${avg}% across ${graded.length} graded items`} />
      {grades.error ? (
        <ErrorState message={grades.error.message} />
      ) : grades.isLoading ? (
        <Skeleton height={240} />
      ) : !list.length ? (
        <EmptyState icon="award" title="No grades yet" message="Quiz results and graded assignments show up here." />
      ) : (
        <Card padding={0} style={{ overflowX: "auto" }}>
          <table className="ob-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Course</th>
                <th>Result</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.lessonId}>
                  <td>
                    <Link href={playerHref(g.courseId, g.lessonId)} className="flex items-center gap-2" style={{ color: "var(--text-strong)", fontWeight: 600 }}>
                      <Icon name={g.kind === "QUIZ" ? "circle-help" : "clipboard-check"} size={16} color="var(--ink-500)" />
                      {g.title}
                    </Link>
                    {g.feedback && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, maxWidth: 380 }}>“{g.feedback}”</div>}
                  </td>
                  <td>{g.courseTitle}</td>
                  <td style={{ font: "600 14px var(--font-display)", color: "var(--text-strong)" }}>{g.points != null ? `${g.points}/${g.maxPoints}` : g.percent != null ? `${g.percent}%` : "—"}</td>
                  <td>
                    <Badge tone={GRADE_TONE[g.status] ?? "neutral"}>{GRADE_LABEL[g.status] ?? g.status}</Badge>
                  </td>
                  <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{date(g.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---- Orders -------------------------------------------------------------------------------------

const ORDER_TONE: Record<OrderView["status"], BadgeTone> = { PAID: "success", PENDING: "warning", REFUNDED: "neutral", CANCELLED: "neutral", FAILED: "danger" };

export function OrdersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [refunding, setRefunding] = useState<OrderView | null>(null);
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.get<OrderView[]>("/me/orders") });
  const refund = useMutation({
    mutationFn: (o: OrderView) => api.post<OrderView>(`/me/orders/${o.id}/refund`),
    onSuccess: (o) => {
      setRefunding(null);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      toast({ title: "Refund issued", message: `${price(o.amountCents, o.currency)} for ${o.courseTitle}` });
    },
  });
  const list = (orders.data ?? []).filter((o) => o.status !== "CANCELLED");
  return (
    <div className="max-w-[880px]">
      <PageHead title="Orders" sub="Your course purchases. Refunds are available for 30 days." />
      {orders.isLoading ? (
        <Skeleton height={200} />
      ) : !list.length ? (
        <EmptyState icon="receipt" title="No orders yet" message="Paid courses you buy appear here with their receipts." />
      ) : (
        <Card padding={0}>
          <table className="ob-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td style={{ color: "var(--text-strong)", fontWeight: 600 }}>{o.courseSlug ? <Link href={`/learn/browse/${o.courseSlug}`}>{o.courseTitle}</Link> : o.courseTitle}</td>
                  <td>{price(o.amountCents, o.currency)}</td>
                  <td>
                    <Badge tone={ORDER_TONE[o.status]}>{o.status.charAt(0) + o.status.slice(1).toLowerCase()}</Badge>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{date(o.paidAt ?? o.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    {o.refundable && (
                      <Button size="sm" variant="ghost" iconLeft="undo-2" onClick={() => setRefunding(o)}>
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Dialog
        open={!!refunding}
        onClose={() => setRefunding(null)}
        icon="undo-2"
        iconTone="danger"
        title="Refund this course?"
        description={refunding ? `You'll get ${price(refunding.amountCents, refunding.currency)} back and lose access to ${refunding.courseTitle}.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefunding(null)}>
              Keep the course
            </Button>
            <Button variant="danger" loading={refund.isPending} onClick={() => refunding && refund.mutate(refunding)}>
              Refund
            </Button>
          </>
        }
      >
        {refund.error && <div className="ob-help ob-help--error">{refund.error.message}</div>}
      </Dialog>
    </div>
  );
}

// ---- Notifications ------------------------------------------------------------------------------

export function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const list = useQuery({ queryKey: ["notifications", "page", tab], queryFn: () => api.get<Page<NotificationView>>(`/me/notifications?size=50${tab === "unread" ? "&unread=true" : ""}`) });
  const markAll = useMutation({ mutationFn: () => api.post("/me/notifications/read-all"), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const open = async (n: NotificationView) => {
    if (!n.read) await api.post(`/me/notifications/${n.id}/read`);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    if (n.link) {
      const u = new URL(n.link, window.location.origin);
      router.push(u.pathname + u.search);
    }
  };
  return (
    <div className="max-w-[760px]">
      <PageHead
        title="Notifications"
        actions={
          <Button variant="secondary" iconLeft="check-check" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Mark all read
          </Button>
        }
      />
      <Tabs value={tab} onChange={setTab} items={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }]} style={{ marginBottom: 16 }} />
      {list.isLoading ? (
        <Skeleton height={240} />
      ) : !list.data?.items.length ? (
        <EmptyState icon="inbox" title={tab === "unread" ? "No unread notifications" : "No notifications yet"} />
      ) : (
        <Card padding="6px">
          {list.data.items.map((n) => (
            <button key={n.id} type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 text-left hover:bg-ink-50" style={{ padding: 12, borderRadius: 10, border: 0, background: "transparent", cursor: "pointer" }}>
              <i style={{ width: 8, height: 8, marginTop: 7, borderRadius: 9, background: n.read ? "transparent" : "var(--coral-500)", flex: "none" }} />
              <span className="min-w-0 flex-1">
                <span className="block" style={{ font: `${n.read ? 500 : 600} 14px/20px var(--font-body)`, color: "var(--text-strong)" }}>
                  {n.title}
                </span>
                {n.body && (
                  <span className="block" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {n.body}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>
                <RelativeTime iso={n.createdAt} />
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---- Settings -----------------------------------------------------------------------------------

export function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const [name, setName] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [uploading, setUploading] = useState(false);
  const notif = useQuery({ queryKey: ["notification-settings"], queryFn: () => api.get<{ emailEnabled: boolean }>("/me/notification-settings") });
  const orgs = useQuery({ queryKey: ["my-orgs"], queryFn: () => api.get<MembershipView[]>("/me/organizations") });
  const saveProfile = useMutation({
    mutationFn: (body: { fullName?: string; avatarUrl?: string }) => api.patch("/me", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Profile saved" });
    },
  });
  const changePassword = useMutation({
    mutationFn: () => api.post("/me/password", { currentPassword: pw.current, newPassword: pw.next }),
    onSuccess: () => {
      setPw({ current: "", next: "" });
      toast({ title: "Password changed", message: "Other sessions were signed out." });
    },
  });
  const setEmail = useMutation({
    mutationFn: (emailEnabled: boolean) => api.put("/me/notification-settings", { emailEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-settings"] }),
  });
  if (!me.data) return <Skeleton height={400} />;
  const u = me.data.user;
  const avatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const f = await uploadFile(file, "AVATAR");
      saveProfile.mutate({ avatarUrl: f.publicUrl ?? undefined });
    } catch (e) {
      toast({ tone: "danger", title: "Upload failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <PageHead title="Settings" sub={`${roleLabel(me.data.role)} at ${me.data.organization.name}`} />
      <Card title="Profile">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={u.avatarUrl} name={u.fullName} size={72} />
          <label className="ob-btn ob-btn--secondary ob-btn--sm" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={16} />
            {uploading ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={(e) => avatar(e.target.files?.[0])} />
          </label>
        </div>
        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name?.trim()) saveProfile.mutate({ fullName: name.trim() });
          }}
        >
          <Input label="Full name" value={name ?? u.fullName} onChange={(e) => setName(e.target.value)} containerStyle={{ flex: 1, minWidth: 220 }} />
          <Input label="Email" value={u.email} disabled containerStyle={{ flex: 1, minWidth: 220 }} />
          <Button type="submit" loading={saveProfile.isPending} disabled={!name || name === u.fullName}>
            Save
          </Button>
        </form>
      </Card>
      <Card title="Password">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <Input label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} containerStyle={{ flex: 1, minWidth: 200 }} />
          <Input label="New password" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} containerStyle={{ flex: 1, minWidth: 200 }} />
          <Button type="submit" variant="secondary" loading={changePassword.isPending} disabled={!pw.current || pw.next.length < 8}>
            Change password
          </Button>
        </form>
        {changePassword.error && <div className="ob-help ob-help--error" style={{ marginTop: 8 }}>{changePassword.error.message}</div>}
      </Card>
      <Card title="Notifications">
        <Switch
          label="Email me about grades, replies, sessions and deadlines"
          description="Receipts, invites and password resets are always emailed."
          checked={notif.data?.emailEnabled ?? true}
          disabled={!notif.data}
          onChange={(e) => setEmail.mutate(e.target.checked)}
        />
      </Card>
      {orgs.data && orgs.data.length > 1 && (
        <Card title="Organizations">
          {orgs.data.map((m) => (
            <div key={m.organization.id} className="flex items-center gap-3" style={{ padding: "8px 0" }}>
              <Icon name="building-2" size={18} color="var(--ink-500)" />
              <span className="flex-1" style={{ color: "var(--text-strong)", fontWeight: 600 }}>
                {m.organization.name}
              </span>
              <Badge tone={m.organization.id === me.data.organization.id ? "accent" : "neutral"}>{roleLabel(m.role)}</Badge>
            </div>
          ))}
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Switch organizations from the menu under your name.</p>
        </Card>
      )}
    </div>
  );
}
