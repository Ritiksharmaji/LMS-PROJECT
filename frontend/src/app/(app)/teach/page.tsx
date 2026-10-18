import type { Metadata } from "next";

import { InstructorHome } from "@/components/teach/InstructorHome";

export const metadata: Metadata = { title: "Teaching overview" };

export default function TeachHome() {
  return <InstructorHome />;
}
