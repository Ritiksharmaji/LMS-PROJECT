"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ErrorState, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { playerHref } from "@/lib/course";
import type { LessonContent } from "@/lib/types";

/** Links in notifications point at a lesson; open it in its course player. */
export function LessonRedirect({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const lesson = useQuery({ queryKey: ["lesson", lessonId], queryFn: () => api.get<LessonContent>(`/me/lessons/${lessonId}`) });
  useEffect(() => {
    if (lesson.data) router.replace(playerHref(lesson.data.courseId, lessonId));
  }, [lesson.data, lessonId, router]);
  return lesson.error ? <ErrorState message={lesson.error.message} /> : <Skeleton height={320} />;
}
