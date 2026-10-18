import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/config";
import { searchCourses } from "@/lib/public-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await searchCourses({ sort: "NEWEST", size: 60 });
  return [
    { url: `${APP_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/courses`, changeFrequency: "daily", priority: 0.9 },
    ...courses.items.map((c) => ({ url: `${APP_URL}/courses/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
