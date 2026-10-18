import type { Metadata } from "next";

import { StudentHome } from "@/components/learn/StudentHome";

export const metadata: Metadata = { title: "Dashboard" };

export default function LearnHome() {
  return <StudentHome />;
}
