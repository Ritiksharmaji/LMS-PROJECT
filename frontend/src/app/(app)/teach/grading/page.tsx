import type { Metadata } from "next";
import { Suspense } from "react";

import { GradingPage } from "@/components/teach/Grading";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Gradebook" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton height={320} />}>
      <GradingPage />
    </Suspense>
  );
}
