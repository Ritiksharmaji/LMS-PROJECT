"use client";

import { Badge, CourseCard } from "@/components/ui";
import { cardProps } from "@/lib/course";
import { useEnrollments } from "@/lib/queries";
import type { CourseCard as Course } from "@/lib/types";
import { useSessionRole } from "@/lib/use-session";

import { WishButton } from "./WishButton";

/** Course grid used by the catalog and course pages; shows enrollment progress and wishlist hearts when signed in. */
export function CourseGrid({ courses, cols = 3, basePath = "/courses" }: { courses: Course[]; cols?: 3 | 4; basePath?: string }) {
  const role = useSessionRole();
  const { data: enrollments } = useEnrollments(!!role);
  const byCourse = new Map((enrollments ?? []).map((e) => [e.course.id, e]));
  return (
    <div className={"ob-stagger grid gap-[18px] sm:grid-cols-2 " + (cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {courses.map((c) => {
        const e = byCourse.get(c.id);
        return (
          <CourseCard
            key={c.id}
            {...cardProps(c)}
            href={`${basePath}/${c.slug}`}
            price={e ? "Enrolled" : cardProps(c).price}
            progress={e ? e.progress.percent : undefined}
            badge={e ? <Badge tone="success" dot>Enrolled</Badge> : c.featured ? <Badge tone="dark">Bestseller</Badge> : null}
            action={role ? <WishButton courseId={c.id} /> : null}
          />
        );
      })}
    </div>
  );
}
