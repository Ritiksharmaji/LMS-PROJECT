import type { Metadata } from "next";

import { AdminSettings } from "@/components/admin/AdminPages";

export const metadata: Metadata = { title: "Organization" };

export default function Page() {
  return <AdminSettings />;
}
