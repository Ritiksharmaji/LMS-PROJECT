import type { Metadata } from "next";
import { Suspense } from "react";

import { CourseEditor } from "@/components/teach/CourseEditor";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Edit course" };

async function Editor({ params }: { params: Promise<{ courseId: string }> }) {
  return <CourseEditor courseId={(await params).courseId} />;
}

export default function Page(props: PageProps<"/teach/courses/[courseId]">) {
  return (
    <Suspense fallback={<Skeleton height={480} />}>
      <Editor params={props.params} />
    </Suspense>
  );
}
