"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { useCategories } from "@/components/teach/CreateCourseDialog";
import { Avatar, Badge, Button, Card, Dialog, EmptyState, HUES, Icon, IconButton, Input, PageHead, Select, Skeleton, StatCard, Switch, Tabs, useToast, type BadgeTone, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { count, date, money, price } from "@/lib/format";
import type { CategoryView, CourseCard, Hue, OrderView, OrgSettingsView, Page, RevenueSummary } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

// ---- Course catalog -----------------------------------------------------------------------------

const CATEGORY_ICONS: IconName[] = ["code", "brain", "pen-tool", "briefcase", "sigma", "feather", "database", "users", "compass", "chart-column", "graduation-cap", "book-open"];

function CategoryDialog({ category, onClose }: { category: CategoryView | "new"; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const existing = category === "new" ? null : category;
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? "book-open");
  const [hue, setHue] = useState<Hue>(existing?.hue ?? "orbit");
  const save = useMutation({
    mutationFn: () => (existing ? api.put(`/admin/categories/${existing.id}`, { name, icon, hue, position: existing.position }) : api.post("/admin/categories", { name, icon, hue })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: existing ? "Category saved" : "Category added" });
      onClose();
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save", message: e.message }),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      icon="library"
      title={existing ? "Edit category" : "New category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="mt-1.5 flex flex-col gap-3.5">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <div className="ob-label mb-2">Colour</div>
          <div className="flex gap-2">
            {(Object.keys(HUES) as Hue[]).map((h) => (
              <button key={h} type="button" aria-label={h} aria-pressed={hue === h} onClick={() => setHue(h)} style={{ width: 30, height: 30, borderRadius: 99, cursor: "pointer", background: HUES[h][1], border: hue === h ? "3px solid var(--ink-900)" : "3px solid #fff", boxShadow: "var(--shadow-sm)" }} />
            ))}
          </div>
        </div>
        <div>
          <div className="ob-label mb-2">Icon</div>
          <div className="grid grid-cols-6 gap-1.5">
            {CATEGORY_ICONS.map((i) => (
              <button key={i} type="button" aria-label={i} aria-pressed={icon === i} onClick={() => setIcon(i)} style={{ height: 36, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: "1px solid " + (icon === i ? "var(--accent)" : "var(--border-subtle)"), background: icon === i ? "var(--accent-soft)" : "#fff" }}>
                <Icon name={i} size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function AdminCatalog() {
  const qc = useQueryClient();
  const toast = useToast();
  const categories = useCategories();
  const courses = useQuery({ queryKey: ["instructor-courses"], queryFn: () => api.get<CourseCard[]>("/instructor/courses") });
  const [editing, setEditing] = useState<CategoryView | "new" | null>(null);
  const [tab, setTab] = useState<"courses" | "categories">("courses");
  const removeCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
  const feature = useMutation({
    mutationFn: (c: CourseCard) => api.patch(`/instructor/courses/${c.id}`, { featured: !c.featured }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      toast({ title: "Catalog updated" });
    },
  });
  return (
    <div>
      <PageHead
        title="Course catalog"
        sub={courses.data ? `${courses.data.length} courses · ${categories.data?.length ?? 0} categories` : " "}
        actions={
          tab === "categories" ? (
            <Button iconLeft="plus" onClick={() => setEditing("new")}>
              New category
            </Button>
          ) : (
            <Button variant="secondary" iconLeft="external-link" href="/courses" target="_blank">
              View public catalog
            </Button>
          )
        }
      />
      <Tabs value={tab} onChange={setTab} items={[{ label: "Courses", value: "courses", count: courses.data?.length }, { label: "Categories", value: "categories", count: categories.data?.length }]} style={{ marginBottom: 20 }} />
      {tab === "courses" ? (
        !courses.data ? (
          <Skeleton height={300} />
        ) : !courses.data.length ? (
          <EmptyState icon="library" title="No courses yet" message="Instructors create courses from their Teach area." />
        ) : (
          <Card padding={0} style={{ overflowX: "auto" }}>
            <table className="ob-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Instructor</th>
                  <th>Status</th>
                  <th>Learners</th>
                  <th>Price</th>
                  <th>Bestseller</th>
                </tr>
              </thead>
              <tbody>
                {courses.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/teach/courses/${c.id}`} className="flex items-center gap-2.5" style={{ color: "var(--text-strong)", fontWeight: 600 }}>
                        <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `var(--${c.hue}-100)`, color: `var(--${c.hue}-500)` }}>
                          <Icon name={c.icon} size={16} />
                        </span>
                        {c.title}
                      </Link>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 42 }}>{c.categoryName ?? "Uncategorized"}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.instructorName} size={24} />
                        {c.instructorName}
                      </div>
                    </td>
                    <td>
                      <Badge tone={c.status === "PUBLISHED" ? "success" : c.status === "DRAFT" ? "neutral" : "warning"} dot>
                        {c.status === "PUBLISHED" ? "Live" : c.status === "DRAFT" ? "Draft" : "Archived"}
                      </Badge>
                    </td>
                    <td>{count(c.enrollmentCount)}</td>
                    <td>{price(c.priceCents, c.currency)}</td>
                    <td>
                      <Switch aria-label={`Feature ${c.title}`} checked={c.featured} onChange={() => feature.mutate(c)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : !categories.data ? (
        <Skeleton height={200} />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.data.map((c) => (
            <Card key={c.id} padding={18}>
              <div className="flex items-center gap-3">
                <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `var(--${c.hue}-100)`, color: c.hue === "ink" ? "var(--ink-800)" : `var(--${c.hue}-700)` }}>
                  <Icon name={c.icon} />
                </span>
                <div className="flex-1">
                  <div style={{ font: "600 15px var(--font-display)", color: "var(--text-strong)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.courseCount} published</div>
                </div>
                <IconButton icon="pencil" label={`Edit ${c.name}`} size="sm" onClick={() => setEditing(c)} />
                <IconButton icon="trash-2" label={`Delete ${c.name}`} size="sm" onClick={() => confirm(`Delete “${c.name}”? Its courses become uncategorized.`) && removeCategory.mutate(c.id)} />
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <CategoryDialog category={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ---- Orders -------------------------------------------------------------------------------------

const ORDER_TONE: Record<OrderView["status"], BadgeTone> = { PAID: "success", PENDING: "warning", REFUNDED: "neutral", CANCELLED: "neutral", FAILED: "danger" };

export function AdminOrders() {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [days, setDays] = useState("30");
  const orders = useQuery({ queryKey: ["admin-orders", status], queryFn: () => api.get<Page<OrderView>>(`/admin/orders?size=100${status ? `&status=${status}` : ""}`) });
  const revenue = useQuery({ queryKey: ["revenue", days], queryFn: () => api.get<RevenueSummary>(`/admin/revenue?days=${days}`) });
  const refund = useMutation({
    mutationFn: (o: OrderView) => api.post(`/admin/orders/${o.id}/refund`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["revenue"] });
      toast({ title: "Refund issued" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't refund", message: e.message }),
  });
  const r = revenue.data;
  const sum = (list: RevenueSummary["paid"] | undefined) => (list ?? []).map((x) => money(x.amountCents, x.currency)).join(" · ") || money(0);
  return (
    <div>
      <PageHead
        title="Orders"
        sub="Course purchases and refunds"
        actions={<Select size="sm" aria-label="Period" value={days} onChange={(e) => setDays(e.target.value)} options={[{ value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "365", label: "Last 12 months" }]} />}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={r ? sum(r.paid) : "–"} icon="wallet" tone="green" hint={r ? `${r.paid.reduce((a, x) => a + x.orders, 0)} paid orders` : undefined} />
        <StatCard label="Refunded" value={r ? sum(r.refunded) : "–"} icon="undo-2" tone="amber" hint={r ? `${r.refunded.reduce((a, x) => a + x.orders, 0)} refunds` : undefined} />
        <StatCard label="Orders shown" value={orders.data ? count(orders.data.total) : "–"} icon="receipt" tone="ink" />
      </div>
      <Tabs
        value={status}
        onChange={setStatus}
        items={[
          { label: "All", value: "" },
          { label: "Paid", value: "PAID" },
          { label: "Pending", value: "PENDING" },
          { label: "Refunded", value: "REFUNDED" },
        ]}
        style={{ marginBottom: 16 }}
      />
      {!orders.data ? (
        <Skeleton height={240} />
      ) : !orders.data.items.length ? (
        <EmptyState icon="receipt" title="No orders" />
      ) : (
        <Card padding={0} style={{ overflowX: "auto" }}>
          <table className="ob-table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.data.items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div style={{ color: "var(--text-strong)", fontWeight: 600 }}>{o.buyerName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.buyerEmail}</div>
                  </td>
                  <td>{o.courseTitle}</td>
                  <td>{money(o.amountCents, o.currency)}</td>
                  <td>
                    <Badge tone={ORDER_TONE[o.status]}>{o.status.charAt(0) + o.status.slice(1).toLowerCase()}</Badge>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{date(o.paidAt ?? o.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    {o.status === "PAID" && (
                      <Button size="sm" variant="ghost" iconLeft="undo-2" onClick={() => confirm(`Refund ${price(o.amountCents, o.currency)} to ${o.buyerName}? They lose access to the course.`) && refund.mutate(o)}>
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
    </div>
  );
}

// ---- Organization settings ----------------------------------------------------------------------

export function AdminSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const s = useQuery({ queryKey: ["org-settings"], queryFn: () => api.get<OrgSettingsView>("/admin/organization") });
  const [name, setName] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<OrgSettingsView>("/admin/organization", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Organization saved" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save", message: e.message }),
  });
  if (!s.data) return <Skeleton height={360} />;
  const o = s.data;
  const logo = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    try {
      const up = await uploadFile(f, "ORG_LOGO");
      save.mutate({ logoUrl: up.publicUrl });
    } catch (e) {
      toast({ tone: "danger", title: "Upload failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <PageHead title="Organization" sub={`orbitly · ${o.slug}`} />
      <Card title="Profile">
        <div className="flex flex-wrap items-center gap-5">
          <span style={{ width: 72, height: 72, borderRadius: 18, overflow: "hidden", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-700)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {o.logoUrl ? <img src={o.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="building-2" size={30} />}
          </span>
          <label className="ob-btn ob-btn--secondary ob-btn--sm" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={16} />
            {uploading ? "Uploading…" : "Upload logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => logo(e.target.files?.[0])} />
          </label>
        </div>
        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name?.trim()) save.mutate({ name: name.trim() });
          }}
        >
          <Input label="Name" value={name ?? o.name} onChange={(e) => setName(e.target.value)} containerStyle={{ flex: 1, minWidth: 240 }} />
          <Button type="submit" disabled={!name || name === o.name} loading={save.isPending}>
            Save
          </Button>
        </form>
      </Card>
      <Card title="Seats">
        <p style={{ margin: "0 0 14px", color: "var(--text-muted)" }}>
          {count(o.seatsUsed)} active members and {o.pendingInvites} pending invites. {o.seatLimit ? `Limit: ${count(o.seatLimit)}.` : "No limit."}
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(limit === "" ? { clearSeatLimit: true } : { seatLimit: Number(limit) });
          }}
        >
          <Input label="Seat limit" type="number" min={0} placeholder="Unlimited" value={limit ?? (o.seatLimit != null ? String(o.seatLimit) : "")} onChange={(e) => setLimit(e.target.value)} containerStyle={{ width: 200 }} />
          <Button type="submit" variant="secondary" disabled={limit === null} loading={save.isPending}>
            Update limit
          </Button>
        </form>
      </Card>
      <Card title="Access">
        <Switch label="Allow self sign-up" description="When off, people can only join with an invite." checked={o.selfSignup} onChange={(e) => save.mutate({ selfSignup: e.target.checked })} />
      </Card>
    </div>
  );
}
