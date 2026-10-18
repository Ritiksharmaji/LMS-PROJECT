import type { Metadata } from "next";
import { Suspense } from "react";

import { CourseDetailView } from "@/components/public/CourseDetailView";
import { Skeleton } from "@/components/ui";
import { getCourse } from "@/lib/public-api";

export async function generateMetadata(props: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getCourse(slug);
  if (!detail) return { title: "Course not found" };
  const c = detail.course;
  return {
    title: c.title,
    description: c.tagline ?? undefined,
    openGraph: { title: c.title, description: c.tagline ?? undefined, images: c.coverUrl ? [c.coverUrl] : undefined },
  };
}

export default function CoursePage(props: PageProps<"/courses/[slug]">) {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pt-8 md:px-10">
      <Suspense fallback={<Skeleton height={360} style={{ borderRadius: 24 }} />}>
        <CourseContent params={props.params} />
      </Suspense>
    </main>
  );
}

async function CourseContent({ params }: { params: Promise<{ slug: string }> }) {
  return <CourseDetailView slug={(await params).slug} />;
}
