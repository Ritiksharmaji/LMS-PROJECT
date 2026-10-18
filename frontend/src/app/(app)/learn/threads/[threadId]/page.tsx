import type { Metadata } from "next";
import { Suspense } from "react";

import { ThreadPage } from "@/components/learn/ThreadPage";

export const metadata: Metadata = { title: "Discussion" };

async function Thread({ params }: { params: Promise<{ threadId: string }> }) {
  return <ThreadPage threadId={(await params).threadId} />;
}

export default function Page(props: PageProps<"/learn/threads/[threadId]">) {
  return (
    <Suspense>
      <Thread params={props.params} />
    </Suspense>
  );
}
