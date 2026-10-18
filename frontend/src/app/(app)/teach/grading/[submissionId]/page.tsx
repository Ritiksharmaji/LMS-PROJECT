import type { Metadata } from "next";
import { Suspense } from "react";

import { SubmissionPage } from "@/components/teach/Grading";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Grade submission" };

async function Submission({ params }: { params: Promise<{ submissionId: string }> }) {
  return <SubmissionPage submissionId={(await params).submissionId} />;
}

export default function Page(props: PageProps<"/teach/grading/[submissionId]">) {
  return (
    <Suspense fallback={<Skeleton height={360} />}>
      <Submission params={props.params} />
    </Suspense>
  );
}
