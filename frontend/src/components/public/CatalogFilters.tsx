"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Checkbox, Input, Radio, Select, Spinner, Tag } from "@/components/ui";
import type { CategoryView } from "@/lib/types";

const LEVELS = [
  ["BEGINNER", "Beginner"],
  ["INTERMEDIATE", "Intermediate"],
  ["ADVANCED", "Advanced"],
] as const;

export const SORTS = [
  { value: "POPULAR", label: "Most popular" },
  { value: "RATING", label: "Highest rated" },
  { value: "NEWEST", label: "Newest" },
  { value: "PRICE_ASC", label: "Price: low to high" },
  { value: "PRICE_DESC", label: "Price: high to low" },
];

const lbl = { font: "600 11px/16px var(--font-body)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 10 } as const;

/** Filters live in the URL so results are shareable, bookmarkable and server-rendered. */
function useParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.push(`${pathname}${next.size ? "?" + next : ""}`, { scroll: false }));
  };
  return { params, set, pending, reset: () => start(() => router.push(pathname, { scroll: false })) };
}

export function CategoryTags({ categories }: { categories: CategoryView[] }) {
  const { params, set } = useParamsUpdater();
  const current = params.get("category") ?? "";
  return (
    <div className="mb-[22px] flex flex-wrap gap-2">
      <Tag selected={!current} onClick={() => set({ category: null })}>
        All
      </Tag>
      {categories.map((c) => (
        <Tag key={c.id} selected={current === c.slug} onClick={() => set({ category: c.slug })}>
          {c.name}
        </Tag>
      ))}
    </div>
  );
}

export function SortSelect() {
  const { params, set, pending } = useParamsUpdater();
  return (
    <div className="flex items-center gap-2">
      {pending && <Spinner size={16} />}
      <Select size="sm" aria-label="Sort courses" value={params.get("sort") ?? "POPULAR"} onChange={(e) => set({ sort: e.target.value === "POPULAR" ? null : e.target.value })} options={SORTS} />
    </div>
  );
}

function KeywordFilter({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q);
      }}
    >
      <Input iconLeft="search" size="sm" placeholder="Filter by keyword" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter by keyword" />
    </form>
  );
}

export function FilterSidebar() {
  const { params, set, reset } = useParamsUpdater();
  const keyword = params.get("q") ?? "";
  const level = params.get("level") ?? "";
  const price = params.get("price") ?? "";
  const rating = params.get("rating") ?? "";
  return (
    <aside className="flex flex-col gap-6 md:sticky md:top-24">
      {/* Remounts when the URL's keyword changes (e.g. a search from the top bar). */}
      <KeywordFilter key={keyword} initial={keyword} onSearch={(q) => set({ q })} />
      <div>
        <div style={lbl}>Level</div>
        <div className="flex flex-col gap-2.5">
          {LEVELS.map(([v, l]) => (
            <Checkbox key={v} label={l} checked={level === v} onChange={() => set({ level: level === v ? null : v })} />
          ))}
        </div>
      </div>
      <div>
        <div style={lbl}>Price</div>
        <div className="flex flex-col gap-2.5">
          {[
            ["", "All"],
            ["free", "Free"],
            ["paid", "Paid"],
          ].map(([v, l]) => (
            <Radio key={v} name="price" label={l} checked={price === v} onChange={() => set({ price: v || null })} />
          ))}
        </div>
      </div>
      <div>
        <div style={lbl}>Rating</div>
        <div className="flex flex-col gap-2.5">
          {[
            ["", "Any rating"],
            ["4.5", "4.5 & up"],
            ["4.7", "4.7 & up"],
          ].map(([v, l]) => (
            <Radio key={v} name="rating" label={l} checked={rating === v} onChange={() => set({ rating: v || null })} />
          ))}
        </div>
      </div>
      <Button variant="ghost" size="sm" iconLeft="rotate-ccw" onClick={reset} style={{ alignSelf: "flex-start" }}>
        Clear filters
      </Button>
    </aside>
  );
}
