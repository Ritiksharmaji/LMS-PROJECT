"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Card, HUES, Icon, IconButton, Input, Select, Textarea, useToast, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import type { CourseEditorView, CourseLevel, Hue } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

import { useCategories } from "./CreateCourseDialog";

const ICON_CHOICES: IconName[] = ["book-open", "brain", "code", "terminal", "database", "cpu", "sigma", "infinity", "pen-tool", "users", "compass", "briefcase", "wallet", "feather", "graduation-cap", "presentation", "chart-column", "flame"];

export function DetailsForm({ editor, onSaved }: { editor: CourseEditorView; onSaved: () => void }) {
  const toast = useToast();
  const categories = useCategories();
  const c = editor.course;
  const [form, setForm] = useState({
    title: c.title,
    tagline: c.tagline ?? "",
    description: editor.description ?? "",
    categoryId: editor.categoryId ?? "",
    level: c.level as CourseLevel,
    price: c.priceCents ? (c.priceCents / 100).toFixed(2) : "",
    hue: c.hue as Hue,
    icon: c.icon,
    coverUrl: c.coverUrl ?? "",
    outcomes: editor.outcomes.length ? editor.outcomes : [""],
  });
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/instructor/courses/${c.id}`, {
        title: form.title,
        tagline: form.tagline,
        description: form.description,
        ...(form.categoryId ? { categoryId: form.categoryId } : { clearCategory: true }),
        level: form.level,
        priceCents: Math.round((Number(form.price) || 0) * 100),
        hue: form.hue,
        icon: form.icon,
        coverUrl: form.coverUrl,
        outcomes: form.outcomes.map((o) => o.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      onSaved();
      toast({ title: "Course saved" });
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't save", message: e.message }),
  });

  const cover = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const f = await uploadFile(file, "COURSE_COVER", c.id);
      if (f.publicUrl) set("coverUrl", f.publicUrl);
    } catch (e) {
      toast({ tone: "danger", title: "Upload failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(false);
    }
  };

  const [bg, fg] = HUES[form.hue] ?? HUES.coral;
  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex flex-col gap-5">
        <Card title="Basics">
          <div className="flex flex-col gap-4">
            <Input label="Title" required maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} />
            <Input label="Tagline" maxLength={300} placeholder="One sentence on what learners will get" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            <Textarea label="Description" rows={7} value={form.description} onChange={(e) => set("description", e.target.value)} help="Blank lines start new paragraphs." />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Category" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} options={[{ value: "", label: "Uncategorized" }, ...(categories.data ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
              <Select label="Level" value={form.level} onChange={(e) => set("level", e.target.value as CourseLevel)} options={[{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }]} />
              <Input label={`Price (${c.currency})`} type="number" min={0} step="0.01" placeholder="0 = free" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
          </div>
        </Card>
        <Card title="What learners will achieve">
          <div className="flex flex-col gap-2.5">
            {form.outcomes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon name="check" size={18} color="var(--success)" />
                <Input value={o} placeholder="e.g. Train and evaluate a regression model" onChange={(e) => set("outcomes", form.outcomes.map((x, j) => (j === i ? e.target.value : x)))} containerStyle={{ flex: 1 }} aria-label={`Outcome ${i + 1}`} />
                <IconButton icon="trash-2" label="Remove outcome" size="sm" onClick={() => set("outcomes", form.outcomes.filter((_, j) => j !== i))} />
              </div>
            ))}
            <Button variant="ghost" size="sm" iconLeft="plus" onClick={() => set("outcomes", [...form.outcomes, ""])} style={{ alignSelf: "flex-start" }} disabled={form.outcomes.length >= 20}>
              Add outcome
            </Button>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-5">
        <Card title="Look" padding={20}>
          <div className="ob-course__cover" style={{ background: bg, color: fg, borderRadius: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {form.coverUrl ? <img src={form.coverUrl} alt="" /> : <Icon name={form.icon} size={44} />}
          </div>
          <div className="mt-3 flex gap-2">
            <label className="ob-btn ob-btn--secondary ob-btn--sm" style={{ cursor: "pointer" }}>
              <Icon name="image" size={16} />
              {uploading ? "Uploading…" : "Upload cover"}
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => cover(e.target.files?.[0])} />
            </label>
            {form.coverUrl && (
              <Button size="sm" variant="ghost" onClick={() => set("coverUrl", "")}>
                Remove
              </Button>
            )}
          </div>
          <div className="ob-label" style={{ margin: "16px 0 8px" }}>
            Colour
          </div>
          <div className="flex gap-2">
            {(Object.keys(HUES) as Hue[]).map((h) => (
              <button key={h} type="button" aria-label={h} aria-pressed={form.hue === h} onClick={() => set("hue", h)} style={{ width: 30, height: 30, borderRadius: 99, cursor: "pointer", background: HUES[h][1], border: form.hue === h ? "3px solid var(--ink-900)" : "3px solid var(--surface-card)", boxShadow: "var(--shadow-sm)" }} />
            ))}
          </div>
          <div className="ob-label" style={{ margin: "16px 0 8px" }}>
            Icon
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_CHOICES.map((i) => (
              <button key={i} type="button" aria-label={i} aria-pressed={form.icon === i} onClick={() => set("icon", i)} style={{ height: 36, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", border: "1px solid " + (form.icon === i ? "var(--accent)" : "var(--border-subtle)"), background: form.icon === i ? "var(--accent-soft)" : "var(--surface-card)", color: form.icon === i ? "var(--coral-700)" : "var(--ink-600)" }}>
                <Icon name={i} size={18} />
              </button>
            ))}
          </div>
        </Card>
        <Button type="submit" size="lg" fullWidth iconLeft="save" loading={save.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
