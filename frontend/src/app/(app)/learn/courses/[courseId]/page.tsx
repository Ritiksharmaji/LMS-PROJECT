import type { Metadata } from "next";
import { Suspense } from "react";

import { CoursePlayer } from "@/components/learn/player/CoursePlayer";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Course player" };

async function Player({ params }: { params: Promise<{ courseId: string }> }) {
  return <CoursePlayer courseId={(await params).courseId} />;
}

export default function PlayerPage(props: PageProps<"/learn/courses/[courseId]">) {
  return (
    <Suspense fallback={<Skeleton height={520} />}>
      <Player params={props.params} />
    </Suspense>
  );
}
