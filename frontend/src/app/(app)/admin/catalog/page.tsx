import type { Metadata } from "next";

import { AdminCatalog } from "@/components/admin/AdminPages";

export const metadata: Metadata = { title: "Course catalog" };

export default function Page() {
  return <AdminCatalog />;
}
