import type { Metadata } from "next";

import { AdminOrders } from "@/components/admin/AdminPages";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <AdminOrders />;
}
