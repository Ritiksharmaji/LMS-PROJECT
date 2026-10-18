import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogResults } from "@/components/public/CatalogResults";
import { Skeleton } from "@/components/ui";
import { getCategories } from "@/lib/public-api";

export const metadata: Metadata = {
  title: "Browse courses",
  description: "Explore expert-led courses in development, data, design, business, mathematics and the humanities.",
};

export default async function CatalogPage(props: PageProps<"/courses">) {
  const categories = await getCategories();
  return (
    <main className="mx-auto max-w-[1240px] px-4 pt-8 md:px-10">
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults searchParams={props.searchParams} categories={categories} />
      </Suspense>
    </main>
  );
}

function CatalogSkeleton() {
  return (
    <div>
      <Skeleton height={38} width={320} />
      <Skeleton height={18} width={160} style={{ marginTop: 10 }} />
      <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={320} />
        ))}
      </div>
    </div>
  );
}
