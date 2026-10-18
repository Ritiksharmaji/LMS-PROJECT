import { Suspense } from "react";

import { LessonRedirect } from "@/components/learn/LessonRedirect";

async function Redirect({ params }: { params: Promise<{ lessonId: string }> }) {
  return <LessonRedirect lessonId={(await params).lessonId} />;
}

export default function LessonPage(props: PageProps<"/learn/lessons/[lessonId]">) {
  return (
    <Suspense>
      <Redirect params={props.params} />
    </Suspense>
  );
}
