import Link from "next/link";

import { Button, EmptyState, PageHead } from "@/components/ui";
import { searchCourses } from "@/lib/public-api";
import type { CategoryView } from "@/lib/types";

import { CategoryTags, FilterSidebar, SortSelect } from "./CatalogFilters";
import { CourseGrid } from "./CourseGrid";

const PAGE_SIZE = 12;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Reads the URL's filters (a request-time API, so it renders inside Suspense) and fetches the cached results. */
export async function CatalogResults({ searchParams, categories, orgSlug, basePath = "/courses" }: { searchParams: Promise<Search>; categories: CategoryView[]; orgSlug?: string; basePath?: string }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const minRating = Number(one(sp.rating)) || 0;
  const page = Math.max(0, Number(one(sp.page)) || 0);
  const query = { q, category, level: one(sp.level), price: one(sp.price), sort: one(sp.sort) || "POPULAR" };

  // The API has no rating filter, so with one selected we filter the first 60 matches here and show them together.
  const result = await searchCourses(minRating ? { ...query, size: 60 } : { ...query, page, size: PAGE_SIZE }, orgSlug);
  const courses = minRating ? result.items.filter((c) => c.ratingCount > 0 && Number(c.ratingAvg) >= minRating) : result.items;
  const total = minRating ? courses.length : result.total;
  const totalPages = minRating ? 1 : result.totalPages;
  const allCourses = categories.reduce((a, c) => a + c.courseCount, 0);
  const categoryName = categories.find((c) => c.slug === category)?.name;
  const pageHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v === undefined ? [] : [[k, one(v)]])));
    if (p) next.set("page", String(p));
    else next.delete("page");
    return `${basePath}${next.size ? "?" + next : ""}`;
  };

  return (
    <div>
      <PageHead
        title={q ? `Results for “${q}”` : categoryName ?? "Browse courses"}
        sub={`${total} of ${allCourses || total} courses`}
        actions={<SortSelect />}
      />
      <CategoryTags categories={categories} />
      <div className="grid items-start gap-7 md:grid-cols-[220px_minmax(0,1fr)]">
        <FilterSidebar />
        {courses.length ? (
          <div>
            <CourseGrid courses={courses} basePath={basePath} />
            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
                {page > 0 && (
                  <Button variant="secondary" iconLeft="chevron-left" href={pageHref(page - 1)}>
                    Previous
                  </Button>
                )}
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Page {page + 1} of {totalPages}
                </span>
                {page + 1 < totalPages && (
                  <Button variant="secondary" iconRight="chevron-right" href={pageHref(page + 1)}>
                    Next
                  </Button>
                )}
              </nav>
            )}
          </div>
        ) : (
          <EmptyState
            icon="search-x"
            title="No courses match"
            message="Try fewer filters or a different keyword."
            action={
              <Link href={basePath} className="ob-btn ob-btn--secondary ob-btn--md no-underline hover:no-underline">
                Clear filters
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
