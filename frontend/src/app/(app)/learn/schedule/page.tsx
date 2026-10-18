import type { Metadata } from "next";

import { SchedulePage } from "@/components/learn/AccountPages";

export const metadata: Metadata = { title: "Schedule" };

export default function Page() {
  return <SchedulePage />;
}
