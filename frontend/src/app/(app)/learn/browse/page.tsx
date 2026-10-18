import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogResults } from "@/components/public/CatalogResults";
import { Skeleton } from "@/components/ui";
import { getCategories } from "@/lib/public-api";
import { currentOrgSlug } from "@/lib/server-session";

export const metadata: Metadata = { title: "Browse courses" };

async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const org = await currentOrgSlug();
  return <CatalogResults searchParams={searchParams} categories={await getCategories(org)} orgSlug={org} basePath="/learn/browse" />;
}

export default function BrowsePage(props: PageProps<"/learn/browse">) {
  return (
    <Suspense fallback={<Skeleton height={480} />}>
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}
