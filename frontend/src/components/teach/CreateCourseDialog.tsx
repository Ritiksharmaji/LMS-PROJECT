"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Dialog, Input, Select, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/queries";
import type { CategoryView, CourseEditorView } from "@/lib/types";

export function useCategories() {
  const me = useMe();
  const org = me.data?.organization.slug;
  return useQuery({ queryKey: ["categories", org], queryFn: () => api.get<CategoryView[]>(`/public/organizations/${org}/categories`), enabled: !!org });
}

/** "Create a course" from the design: start a draft, then add lessons and publish. */
export function CreateCourseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const categories = useCategories();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("BEGINNER");
  const [priceText, setPriceText] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.post<CourseEditorView>("/instructor/courses", {
        title,
        categoryId: categoryId || undefined,
        level,
        priceCents: Math.round((Number(priceText) || 0) * 100),
      }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      qc.invalidateQueries({ queryKey: ["instructor-overview"] });
      toast({ title: "Draft created", message: `${c.course.title} · add your first lesson` });
      onClose();
      router.push(`/teach/courses/${c.course.id}?tab=curriculum`);
    },
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon="book-plus"
      iconTone="orbit"
      title="Create a course"
      description="Start with a draft. You can add lessons and publish later."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!title.trim()} loading={create.isPending} onClick={() => create.mutate()}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="mt-1.5 flex flex-col gap-3.5">
        <Input label="Course title" placeholder="e.g. Time Series Forecasting" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={[{ value: "", label: "Uncategorized" }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value)} options={[{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }]} />
        </div>
        <Input label="Price (USD)" type="number" min={0} step="0.01" placeholder="0 for free" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
        {create.error && <div className="ob-help ob-help--error">{create.error.message}</div>}
      </div>
    </Dialog>
  );
}
