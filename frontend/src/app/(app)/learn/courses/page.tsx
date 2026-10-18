import type { Metadata } from "next";
import { Suspense } from "react";

import { MyLearning } from "@/components/learn/MyLearning";

export const metadata: Metadata = { title: "My learning" };

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MyLearning tab={(await searchParams).tab === "completed" ? "done" : "progress"} />;
}

export default function MyLearningPage(props: PageProps<"/learn/courses">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
