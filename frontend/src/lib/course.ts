import type { CourseCardProps } from "@/components/ui";

import { duration, level, price } from "./format";
import type { CourseCard } from "./types";

/** Maps an API course card to the design's CourseCard props. */
export function cardProps(c: CourseCard): CourseCardProps {
  return {
    title: c.title,
    category: c.categoryName,
    instructor: c.instructorName,
    lessons: c.lessonCount,
    duration: duration(c.durationMinutes),
    level: level(c.level),
    rating: c.ratingCount ? Number(c.ratingAvg) : null,
    reviews: c.ratingCount,
    price: price(c.priceCents, c.currency),
    cover: c.coverUrl,
    icon: c.icon,
    hue: c.hue,
  };
}

/** The public course page. */
export const courseHref = (c: { slug: string }) => `/courses/${c.slug}`;

/** The course player for enrolled learners. */
export const playerHref = (courseId: string, lessonId?: string | null) =>
  `/learn/courses/${courseId}` + (lessonId ? `?lesson=${lessonId}` : "");
