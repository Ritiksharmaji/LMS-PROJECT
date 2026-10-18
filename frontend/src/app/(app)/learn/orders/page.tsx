import type { Metadata } from "next";

import { OrdersPage } from "@/components/learn/AccountPages";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersPage />;
}
