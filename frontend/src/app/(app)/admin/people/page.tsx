import type { Metadata } from "next";

import { AdminPeople } from "@/components/admin/AdminPeople";

export const metadata: Metadata = { title: "People" };

export default function Page() {
  return <AdminPeople />;
}
