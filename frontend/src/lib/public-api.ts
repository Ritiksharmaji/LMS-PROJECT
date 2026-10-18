import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { API_URL, DEFAULT_ORG } from "./config";
import type { CategoryView, CertificateView, CourseCard, CourseDetail, OrgView, Page, ReviewSummary, ReviewView } from "./types";

/**
 * Cached reads of the public catalog for server-rendered (SEO) pages. Results are shared by every visitor and
 * refreshed every few minutes.
 */
async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}/api/public${path}`, { headers: { accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

const org = (slug = DEFAULT_ORG) => `/organizations/${encodeURIComponent(slug)}`;

export async function getOrganization(slug = DEFAULT_ORG) {
  "use cache";
  cacheLife("hours");
  cacheTag("org");
  return get<OrgView>(org(slug));
}

export async function getCategories(slug = DEFAULT_ORG) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return (await get<CategoryView[]>(`${org(slug)}/categories`)) ?? [];
}

export interface CatalogQuery {
  category?: string;
  level?: string;
  price?: string;
  q?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export async function searchCourses(query: CatalogQuery, slug = DEFAULT_ORG) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return (
    (await get<Page<CourseCard>>(`${org(slug)}/courses?${params}`)) ?? { items: [], page: 0, size: 0, total: 0, totalPages: 0 }
  );
}

export async function getCourse(courseSlug: string, slug = DEFAULT_ORG) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `course:${courseSlug}`);
  return get<CourseDetail>(`${org(slug)}/courses/${encodeURIComponent(courseSlug)}`);
}

export async function getReviews(courseId: string, slug = DEFAULT_ORG) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`reviews:${courseId}`);
  const [list, summary] = await Promise.all([
    get<Page<ReviewView>>(`${org(slug)}/courses/${courseId}/reviews?size=6`),
    get<ReviewSummary>(`${org(slug)}/courses/${courseId}/reviews/summary`),
  ]);
  return { list: list?.items ?? [], summary };
}

export async function getCertificate(code: string) {
  "use cache";
  cacheLife("days");
  return get<CertificateView>(`/certificates/${encodeURIComponent(code)}`);
}
