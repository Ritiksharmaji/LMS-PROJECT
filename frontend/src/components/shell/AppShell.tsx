"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Avatar, Icon, IconButton, Input, RelativeTime, Sidebar, Skeleton, type IconName } from "@/components/ui";
import { api, session } from "@/lib/api";
import { role as roleLabel } from "@/lib/format";
import { useMe } from "@/lib/queries";
import type { InstructorOverview, LearningSummary, MembershipView, NotificationView, OrgSettingsView, Page, Role } from "@/lib/types";

import { AREAS, navFor } from "./nav";

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const KIND_ICON: Record<string, [IconName, string]> = {
  SUBMISSION_GRADED: ["circle-check", "green"],
  SUBMISSION_RETURNED: ["rotate-ccw", "amber"],
  SUBMISSION_RECEIVED: ["clipboard-check", "orbit"],
  THREAD_REPLY: ["message-square", "orbit"],
  THREAD_CREATED: ["message-square", "orbit"],
  COURSE_COMPLETED: ["award", "green"],
  ENROLLED: ["book-open", "coral"],
  ORDER_PAID: ["receipt", "green"],
  ORDER_REFUNDED: ["undo-2", "amber"],
  SESSION_SCHEDULED: ["calendar", "sky"],
  SESSION_RESCHEDULED: ["calendar", "amber"],
  SESSION_CANCELLED: ["calendar", "amber"],
  DEADLINE_SOON: ["clock", "coral"],
};

/** Backend links are absolute URLs to this app; keep navigation client-side. */
function localPath(link: string | null) {
  if (!link) return null;
  try {
    const u = new URL(link, window.location.origin);
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

function NotifMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get<{ unread: number }>("/me/notifications/unread-count"),
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => api.get<Page<NotificationView>>("/me/notifications?size=8"),
    enabled: open,
  });
  const markAll = useMutation({
    mutationFn: () => api.post("/me/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const openOne = (n: NotificationView) => {
    setOpen(false);
    if (!n.read) api.post(`/me/notifications/${n.id}/read`).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
    const path = localPath(n.link);
    if (path) router.push(path);
  };
  const count = unread.data?.unread ?? 0;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconButton icon="bell" label={count ? `Notifications, ${count} unread` : "Notifications"} onClick={() => setOpen((o) => !o)} aria-expanded={open} />
      {count > 0 && <i style={{ position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 9, background: "var(--coral-500)", border: "2px solid #fff", pointerEvents: "none" }} />}
      {open && (
        <div role="menu" style={{ position: "absolute", top: 48, right: 0, width: 360, maxWidth: "calc(100vw - 32px)", background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-subtle)", padding: 8, zIndex: 20 }}>
          <div className="flex items-center justify-between" style={{ padding: "8px 10px" }}>
            <span style={{ font: "600 15px var(--font-display)", color: "var(--text-strong)" }}>Notifications</span>
            {count > 0 && (
              <button type="button" className="ob-btn ob-btn--ghost ob-btn--sm" onClick={() => markAll.mutate()}>
                Mark all read
              </button>
            )}
          </div>
          {list.isLoading && <Skeleton height={120} />}
          {list.data?.items.length === 0 && <div style={{ padding: "18px 10px", color: "var(--text-muted)", fontSize: 13 }}>You&rsquo;re all caught up.</div>}
          {list.data?.items.map((n) => {
            const [ic, h] = KIND_ICON[n.kind] ?? ["sparkles", "coral"];
            return (
              <button key={n.id} type="button" role="menuitem" onClick={() => openOne(n)} className="flex w-full gap-3 text-left hover:bg-ink-50" style={{ padding: 10, borderRadius: 10, border: 0, background: "transparent", cursor: "pointer" }}>
                <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, display: "grid", placeItems: "center", background: `var(--${h}-100)`, color: `var(--${h}-700)` }}>
                  <Icon name={ic} size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="block" style={{ font: `${n.read ? 500 : 600} 14px/20px var(--font-body)`, color: "var(--text-strong)" }}>
                    {n.title}
                  </span>
                  <span className="block" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {n.body ? n.body + " · " : ""}
                    <RelativeTime iso={n.createdAt} />
                  </span>
                </span>
                {!n.read && <i style={{ width: 8, height: 8, marginTop: 6, borderRadius: 9, background: "var(--coral-500)", flex: "none" }} />}
              </button>
            );
          })}
          <Link href="/learn/notifications" onClick={() => setOpen(false)} className="ob-nav no-underline hover:no-underline" style={{ justifyContent: "center", marginTop: 4 }}>
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

function AreaSwitch({ role }: { role: Role }) {
  const pathname = usePathname();
  const areas = AREAS[role];
  if (!areas.length) return null;
  const current = areas.find((a) => pathname === a.href || pathname.startsWith(a.href + "/"))?.href;
  return (
    <nav aria-label="Switch area" className="ob-hide-sm" style={{ display: "inline-flex", padding: 4, gap: 2, background: "var(--surface-sunken)", borderRadius: 12 }}>
      {areas.map((a) => {
        const on = a.href === current;
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={on ? "page" : undefined}
            className="no-underline hover:no-underline"
            style={{ height: 30, padding: "0 12px", borderRadius: 8, font: "600 13px var(--font-body)", display: "flex", alignItems: "center", gap: 6, background: on ? "#fff" : "transparent", color: on ? "var(--text-strong)" : "var(--text-muted)", boxShadow: on ? "var(--shadow-sm)" : "none" }}
          >
            <i style={{ width: 7, height: 7, borderRadius: 9, background: a.dot }} />
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const orgs = useQuery({ queryKey: ["my-orgs"], queryFn: () => api.get<MembershipView[]>("/me/organizations"), enabled: open });
  const switchOrg = useMutation({
    mutationFn: (orgId: string) => session<{ home: string }>("switch", { orgId }),
    onSuccess: (r) => {
      qc.clear();
      router.replace(r.home);
      router.refresh();
    },
  });
  const signOut = async () => {
    await session("logout");
    qc.clear();
    router.replace("/login");
    router.refresh();
  };
  if (!me.data) return <Skeleton height={34} width={160} />;
  const { user, organization, role } = me.data;
  const otherOrgs = (orgs.data ?? []).filter((m) => m.organization.id !== organization.id && m.status === "ACTIVE");
  const items: [IconName, string, () => void][] = [
    ["house", "Public homepage", () => router.push("/")],
    ["book-open", "My learning", () => router.push("/learn/courses")],
    ["receipt", "Orders", () => router.push("/learn/orders")],
    ["settings", "Settings", () => router.push("/learn/settings")],
  ];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2.5" style={{ paddingLeft: 14, borderLeft: "1px solid var(--border-subtle)", background: "none", border: 0, borderLeftStyle: "solid", cursor: "pointer" }}>
        <Avatar src={user.avatarUrl} name={user.fullName} size={34} status="online" />
        <span className="ob-hide-md text-left" style={{ lineHeight: 1.2, whiteSpace: "nowrap" }}>
          <span className="block" style={{ font: "600 13px var(--font-body)", color: "var(--text-strong)" }}>
            {user.fullName}
          </span>
          <span className="block" style={{ font: "400 12px var(--font-body)", color: "var(--text-muted)" }}>
            {roleLabel(role)} · {organization.name}
          </span>
        </span>
        <Icon name="chevron-down" size={16} color="var(--ink-400)" />
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", top: 50, right: 0, width: 240, background: "#fff", borderRadius: 14, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-subtle)", padding: 6, zIndex: 20 }}>
          {items.map(([ic, l, fn]) => (
            <button key={l} type="button" role="menuitem" className="ob-nav" onClick={() => { setOpen(false); fn(); }}>
              <Icon name={ic} size={18} />
              {l}
            </button>
          ))}
          {otherOrgs.length > 0 && (
            <>
              <div className="ob-sidebar__label" style={{ padding: "10px 10px 4px" }}>
                Switch organization
              </div>
              {otherOrgs.map((m) => (
                <button key={m.organization.id} type="button" role="menuitem" className="ob-nav" onClick={() => switchOrg.mutate(m.organization.id)}>
                  <Icon name="building-2" size={18} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{m.organization.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{roleLabel(m.role)}</span>
                </button>
              ))}
            </>
          )}
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "6px 4px" }} />
          <button type="button" role="menuitem" className="ob-nav" onClick={signOut}>
            <Icon name="log-out" size={18} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarFooter({ role }: { role: Role }) {
  const learning = useQuery({ queryKey: ["learning-summary"], queryFn: () => api.get<LearningSummary>("/me/learning/summary"), enabled: role === "STUDENT" });
  const org = useQuery({ queryKey: ["org-settings"], queryFn: () => api.get<OrgSettingsView>("/admin/organization"), enabled: role === "ADMIN" });
  if (role === "ADMIN") {
    const o = org.data;
    return (
      <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "var(--ink-300)", font: "500 12px/18px var(--font-body)" }}>
        <div style={{ color: "#fff", font: "600 13px var(--font-body)", marginBottom: 4 }}>{o?.name ?? "Organization"}</div>
        {o ? `${o.seatsUsed.toLocaleString("en-US")} ${o.seatLimit ? `of ${o.seatLimit.toLocaleString("en-US")} seats` : "members"}` : "…"}
      </div>
    );
  }
  if (role === "INSTRUCTOR") {
    return (
      <div style={{ padding: 14, borderRadius: 14, background: "var(--orbit-100)", font: "500 12px/18px var(--font-body)", color: "var(--orbit-700)" }}>
        <div style={{ font: "600 13px var(--font-display)", marginBottom: 4 }}>Keep learning</div>
        Instructors get every catalog course free.
        <div style={{ marginTop: 10 }}>
          <Link href="/learn/browse" className="ob-btn ob-btn--sm no-underline hover:no-underline" style={{ background: "var(--orbit-500)", color: "#fff" }}>
            Browse courses
          </Link>
        </div>
      </div>
    );
  }
  const goal = 5;
  const done = learning.data?.lessonsThisWeek ?? 0;
  return (
    <div style={{ padding: 14, borderRadius: 14, background: "var(--ink-900)", color: "#fff" }}>
      <div className="flex items-center gap-2" style={{ font: "600 13px var(--font-display)" }}>
        <Icon name="flame" size={18} color="var(--coral-400)" />
        {done} {done === 1 ? "lesson" : "lessons"} this week
      </div>
      <div className="mt-2.5 flex gap-1" aria-label={`${Math.min(done, goal)} of ${goal} weekly goal`}>
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 8, borderRadius: 6, background: i < done ? "var(--coral-500)" : "rgba(255,255,255,.1)" }} />
        ))}
      </div>
      <div style={{ marginTop: 8, font: "400 12px var(--font-body)", color: "var(--ink-300)" }}>
        {done >= goal ? "Weekly goal reached — nice!" : `${goal - done} to your weekly goal`}
      </div>
    </div>
  );
}

function TopSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      style={{ width: 340, minWidth: 140, flexShrink: 1 }}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/learn/browse${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
    >
      <Input iconLeft="search" placeholder="Search courses, topics, instructors" size="sm" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
    </form>
  );
}

/** The signed-in frame: role sidebar (dark for admins), top bar, content column. */
export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [drawer, setDrawer] = useState(false);
  const role = me.data?.role;
  const overview = useQuery({
    queryKey: ["instructor-overview"],
    queryFn: () => api.get<InstructorOverview>("/instructor/analytics/overview"),
    enabled: role === "INSTRUCTOR" || role === "ADMIN",
    staleTime: 60_000,
  });
  const sections = role ? navFor(role, { toGrade: overview.data?.toGrade }) : [];
  const sidebar = role ? (
    <Sidebar sections={sections} dark={role === "ADMIN"} footer={<SidebarFooter role={role} />} onNavigate={() => setDrawer(false)} style={{ height: "100%" }} />
  ) : (
    <aside className="ob-sidebar">
      <Skeleton height={24} width={110} />
    </aside>
  );
  return (
    <div className="flex" style={{ height: "100vh", background: "var(--bg-app)" }}>
      <div className="hidden lg:block" style={{ flex: "none" }}>
        {sidebar}
      </div>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawer(false)} style={{ background: "var(--scrim)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ height: "100%", width: "var(--sidebar-w)" }}>
            {sidebar}
          </div>
        </div>
      )}
      <div id="ob-scroll" className="flex min-w-0 flex-1 flex-col overflow-auto">
        <header className="sticky top-0 z-10 flex flex-none items-center gap-4 px-4 md:px-7" style={{ height: "var(--topbar-h)", borderBottom: "1px solid var(--border-subtle)", background: "rgba(251,250,247,.85)", backdropFilter: "blur(14px)" }}>
          <IconButton icon="menu" label="Open navigation" className="lg:hidden" onClick={() => setDrawer(true)} />
          <TopSearch />
          <div className="flex-1" />
          {role && <AreaSwitch role={role} />}
          <NotifMenu />
          <UserMenu />
        </header>
        <main className="ob-page mx-auto w-full flex-1 px-4 pb-12 pt-7 md:px-8" style={{ maxWidth: "var(--content-max)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
