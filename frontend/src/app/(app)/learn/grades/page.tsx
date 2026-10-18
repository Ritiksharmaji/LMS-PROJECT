import type { Metadata } from "next";

import { GradesPage } from "@/components/learn/AccountPages";

export const metadata: Metadata = { title: "Grades" };

export default function Page() {
  return <GradesPage />;
}
