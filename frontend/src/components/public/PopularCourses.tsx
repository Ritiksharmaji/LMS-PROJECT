"use client";

import { useState } from "react";

import { Badge, Button, CourseCard, Tabs } from "@/components/ui";
import { cardProps, courseHref } from "@/lib/course";
import type { CategoryView, CourseCard as Course } from "@/lib/types";

/** "Popular right now": category tabs over the most popular courses (current category first). */
export function PopularCourses({ categories, courses }: { categories: CategoryView[]; courses: Course[] }) {
  const withCourses = categories.filter((c) => c.courseCount > 0);
  const [cat, setCat] = useState(withCourses[0]?.name ?? "");
  const current = withCourses.find((c) => c.name === cat);
  const list = [...courses.filter((c) => c.categoryName === cat), ...courses.filter((c) => c.categoryName !== cat)].slice(0, 4);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 style={{ font: "600 26px var(--font-display)" }}>Popular right now</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Top-rated courses learners are starting this week.</p>
        </div>
        {current && (
          <Button variant="secondary" iconRight="arrow-right" href={`/courses?category=${current.slug}`}>
            See all {current.name.toLowerCase()}
          </Button>
        )}
      </div>
      {withCourses.length > 1 && (
        <div className="overflow-x-auto">
          <Tabs value={cat} onChange={setCat} items={withCourses.map((c) => ({ label: c.name, value: c.name }))} style={{ margin: "18px 0 20px" }} />
        </div>
      )}
      <div className="ob-stagger grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {list.map((c) => (
          <CourseCard key={c.id} {...cardProps(c)} href={courseHref(c)} badge={c.featured ? <Badge tone="dark">Bestseller</Badge> : null} />
        ))}
      </div>
    </>
  );
}
