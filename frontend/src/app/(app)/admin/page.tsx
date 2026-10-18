import type { Metadata } from "next";

import { AdminHome } from "@/components/admin/AdminHome";

export const metadata: Metadata = { title: "Platform analytics" };

export default function Page() {
  return <AdminHome />;
}
