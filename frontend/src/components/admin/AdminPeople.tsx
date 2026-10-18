"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Avatar, Badge, Button, Card, Dialog, EmptyState, Icon, IconButton, Input, PageHead, RelativeTime, Select, Skeleton, Tabs, Textarea, useToast, type BadgeTone } from "@/components/ui";
import { api } from "@/lib/api";
import { count, role as roleLabel } from "@/lib/format";
import { useMe } from "@/lib/queries";
import type { CreatedInvite, InviteView, MemberCounts, MemberView, OrgSettingsView, Page, Role } from "@/lib/types";

const ROLE_TONE: Record<Role, BadgeTone> = { STUDENT: "accent", INSTRUCTOR: "orbit", ADMIN: "dark" };
const COLS = "2.4fr 1fr 1fr 1fr 48px";
const EMAIL = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

function RowMenu({ member, isMe, onAction }: { member: MemberView; isMe: boolean; onAction: (a: { role?: Role; status?: "ACTIVE" | "SUSPENDED"; remove?: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const item = (label: string, icon: Parameters<typeof Icon>[0]["name"], fn: () => void, danger?: boolean) => (
    <button key={label} type="button" role="menuitem" className="ob-nav" style={danger ? { color: "var(--danger-text)" } : undefined} onClick={() => { setOpen(false); fn(); }}>
      <Icon name={icon} size={17} />
      {label}
    </button>
  );
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconButton icon="ellipsis" label={`Actions for ${member.fullName}`} size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} />
      {open && (
        <div role="menu" style={{ position: "absolute", right: 0, top: 36, width: 220, background: "#fff", borderRadius: 14, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-subtle)", padding: 6, zIndex: 20 }}>
          {(["STUDENT", "INSTRUCTOR", "ADMIN"] as Role[]).filter((r) => r !== member.role).map((r) => item(`Make ${roleLabel(r).toLowerCase()}`, "shield-check", () => onAction({ role: r })))}
          {!isMe && (member.status === "ACTIVE" ? item("Suspend", "ban", () => onAction({ status: "SUSPENDED" })) : item("Reactivate", "rotate-ccw", () => onAction({ status: "ACTIVE" })))}
          {!isMe && item("Remove from organization", "trash-2", () => onAction({ remove: true }), true)}
        </div>
      )}
    </div>
  );
}

function InviteDialog({ open, onClose, settings }: { open: boolean; onClose: () => void; settings?: OrgSettingsView }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [created, setCreated] = useState<CreatedInvite[] | null>(null);
  const emails = [...new Set((text.match(EMAIL) ?? []).map((e) => e.toLowerCase()))];
  const free = settings?.seatLimit != null ? settings.seatLimit - settings.seatsUsed - settings.pendingInvites : null;
  const send = useMutation({
    mutationFn: () => api.post<CreatedInvite[]>("/admin/invites", { emails, role }),
    onSuccess: (list) => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      setCreated(list);
      toast({ title: list.length === 1 ? "Invitation sent" : `${list.length} invitations sent`, message: "They’ll get an email with a sign-in link." });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't send invites", message: e.message }),
  });
  const close = () => {
    setText("");
    setCreated(null);
    onClose();
  };
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const csv = await f.text();
    setText((t) => (t ? t + "\n" : "") + csv);
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      icon="user-plus"
      title="Invite people"
      description="Invites expire after 14 days. Paste addresses or import a CSV."
      width={520}
      footer={
        created ? (
          <Button variant="dark" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="dark" disabled={!emails.length || (free != null && emails.length > free)} loading={send.isPending} onClick={() => send.mutate()}>
              Send {emails.length > 1 ? `${emails.length} invites` : "invite"}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="flex flex-col gap-2">
          <p style={{ margin: 0 }}>Invites are on their way. You can also share these links directly:</p>
          {created.map((c) => (
            <div key={c.id} className="flex items-center gap-2" style={{ fontSize: 13 }}>
              <span className="flex-1" style={{ color: "var(--text-strong)" }}>
                {c.email}
              </span>
              <IconButton icon="copy" label={`Copy invite link for ${c.email}`} size="sm" onClick={() => navigator.clipboard.writeText(c.link).then(() => toast({ tone: "info", title: "Link copied" }))} />
            </div>
          ))}
          {!created.length && <p style={{ color: "var(--text-muted)" }}>Everyone listed is already a member.</p>}
        </div>
      ) : (
        <div className="mt-1.5 flex flex-col gap-3.5">
          <Textarea label="Email addresses" placeholder="name@northfield.edu, another@northfield.edu" value={text} onChange={(e) => setText(e.target.value)} rows={4} help={emails.length ? `${emails.length} address${emails.length === 1 ? "" : "es"} found` : "Separate with commas, spaces or new lines"} />
          <label className="ob-btn ob-btn--secondary ob-btn--sm" style={{ cursor: "pointer", alignSelf: "flex-start" }}>
            <Icon name="upload" size={16} />
            Import CSV
            <input type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={(e) => importFile(e.target.files?.[0])} />
          </label>
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} options={[{ value: "STUDENT", label: "Student" }, { value: "INSTRUCTOR", label: "Instructor" }, { value: "ADMIN", label: "Admin" }]} />
          {free != null && (
            <div style={{ fontSize: 13, color: emails.length > free ? "var(--danger-text)" : "var(--text-muted)" }}>
              {emails.length > free ? `Only ${free} seats left — remove some addresses or raise the seat limit.` : `Uses ${emails.length || 1} of ${count(free)} remaining seats`}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

export function AdminPeople() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<MemberView | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const counts = useQuery({ queryKey: ["member-counts"], queryFn: () => api.get<MemberCounts>("/admin/members/counts") });
  const members = useQuery({
    queryKey: ["members", role, query],
    queryFn: () => api.get<Page<MemberView>>(`/admin/members?size=100${role === "ALL" ? "" : `&role=${role}`}&q=${encodeURIComponent(query)}`),
  });
  const invites = useQuery({ queryKey: ["invites"], queryFn: () => api.get<InviteView[]>("/admin/invites") });
  const settings = useQuery({ queryKey: ["org-settings"], queryFn: () => api.get<OrgSettingsView>("/admin/organization") });
  const refresh = () => ["members", "member-counts", "org-settings", "invites"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: Role; status?: string } }) => api.patch<MemberView>(`/admin/members/${id}`, body),
    onSuccess: (m) => {
      refresh();
      toast({ title: "Member updated", message: `${m.fullName} · ${roleLabel(m.role)} · ${m.status.toLowerCase()}` });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't update", message: e.message }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/members/${id}`),
    onSuccess: () => {
      setRemoving(null);
      refresh();
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't remove", message: e.message }),
  });
  const revoke = useMutation({ mutationFn: (id: string) => api.delete(`/admin/invites/${id}`), onSuccess: refresh });

  const c = counts.data;
  const s = settings.data;
  const pending = (invites.data ?? []).filter((i) => (role === "ALL" || i.role === role) && i.email.includes(query.toLowerCase()));
  return (
    <div>
      <PageHead
        title="People"
        sub={s ? (s.seatLimit ? `${count(s.seatLimit)} seats · ${count(s.seatsUsed)} assigned · ${s.pendingInvites} invited` : `${count(s.seatsUsed)} members · ${s.pendingInvites} invited`) : " "}
        actions={
          <Button variant="dark" iconLeft="user-plus" onClick={() => setInviting(true)}>
            Invite people
          </Button>
        }
      />
      <Tabs
        value={role}
        onChange={setRole}
        items={[
          { label: "Everyone", value: "ALL", count: c?.everyone },
          { label: "Students", value: "STUDENT", count: c?.students },
          { label: "Instructors", value: "INSTRUCTOR", count: c?.instructors },
          { label: "Admins", value: "ADMIN", count: c?.admins },
        ]}
        style={{ marginBottom: 16 }}
      />
      <div className="mb-4 flex gap-2.5">
        <Input iconLeft="search" placeholder="Search by name or email" size="sm" value={q} onChange={(e) => setQ(e.target.value)} containerStyle={{ width: 300, maxWidth: "100%" }} aria-label="Search people" />
      </div>
      <Card padding={0} style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 720 }}>
          <div className="grid" style={{ gridTemplateColumns: COLS, padding: "12px 20px", background: "var(--paper-50)", borderBottom: "1px solid var(--border-subtle)", borderRadius: "16px 16px 0 0", font: "600 11px/16px var(--font-body)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span>Last active</span>
            <span />
          </div>
          {members.isLoading && <Skeleton height={200} />}
          {pending.map((i) => (
            <div key={i.id} className="grid items-center" style={{ gridTemplateColumns: COLS, padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={i.email} size={34} />
                <div className="min-w-0">
                  <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{i.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Invited <RelativeTime iso={i.createdAt} />
                  </div>
                </div>
              </div>
              <span>
                <Badge tone={ROLE_TONE[i.role]}>{roleLabel(i.role)}</Badge>
              </span>
              <span>
                <Badge tone="info" dot>
                  Invited
                </Badge>
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>—</span>
              <IconButton icon="x" label={`Revoke invite for ${i.email}`} size="sm" onClick={() => revoke.mutate(i.id)} />
            </div>
          ))}
          {members.data?.items.map((m) => (
            <div key={m.id} className="grid items-center" style={{ gridTemplateColumns: COLS, padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={m.avatarUrl} name={m.fullName} size={34} />
                <div className="min-w-0">
                  <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>
                    {m.fullName}
                    {m.userId === me.data?.user.id && <span style={{ fontWeight: 400, color: "var(--text-subtle)" }}> (you)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.email}</div>
                </div>
              </div>
              <span>
                <Badge tone={ROLE_TONE[m.role]}>{roleLabel(m.role)}</Badge>
              </span>
              <span>
                <Badge tone={m.status === "ACTIVE" ? "success" : "danger"} dot>
                  {m.status === "ACTIVE" ? "Active" : "Suspended"}
                </Badge>
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <RelativeTime iso={m.lastActiveAt} />
              </span>
              <RowMenu
                member={m}
                isMe={m.userId === me.data?.user.id}
                onAction={(a) => (a.remove ? setRemoving(m) : update.mutate({ id: m.id, body: { role: a.role, status: a.status } }))}
              />
            </div>
          ))}
          {members.data && !members.data.items.length && !pending.length && (
            <div style={{ padding: 32 }}>
              <EmptyState icon="search-x" title={query ? `No people match “${query}”` : "No one here yet"} />
            </div>
          )}
        </div>
      </Card>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} settings={s} />
      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        icon="trash-2"
        iconTone="danger"
        title={`Remove ${removing?.fullName}?`}
        description="They lose access to this organization. Their Orbitly account and other organizations are unaffected."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => removing && remove.mutate(removing.id)}>
              Remove
            </Button>
          </>
        }
      />
    </div>
  );
}
