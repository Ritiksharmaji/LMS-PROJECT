import { Suspense } from "react";

import { CourseDetailView } from "@/components/public/CourseDetailView";
import { Skeleton } from "@/components/ui";
import { currentOrgSlug } from "@/lib/server-session";

async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, org] = await Promise.all([params, currentOrgSlug()]);
  return <CourseDetailView slug={slug} orgSlug={org} basePath="/learn/browse" />;
}

export default function BrowseCoursePage(props: PageProps<"/learn/browse/[slug]">) {
  return (
    <Suspense fallback={<Skeleton height={360} style={{ borderRadius: 24 }} />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
