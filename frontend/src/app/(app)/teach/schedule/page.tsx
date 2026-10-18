import type { Metadata } from "next";
import { Suspense } from "react";

import { TeachSchedule } from "@/components/teach/TeachSchedule";

export const metadata: Metadata = { title: "Live sessions" };

export default function Page() {
  return (
    <Suspense>
      <TeachSchedule />
    </Suspense>
  );
}
