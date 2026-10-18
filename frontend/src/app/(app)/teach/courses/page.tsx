import type { Metadata } from "next";

import { TeachCourses } from "@/components/teach/TeachCourses";

export const metadata: Metadata = { title: "My courses" };

export default function Page() {
  return <TeachCourses />;
}
