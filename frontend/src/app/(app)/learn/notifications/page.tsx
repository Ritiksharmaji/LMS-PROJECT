import type { Metadata } from "next";

import { NotificationsPage } from "@/components/learn/AccountPages";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsPage />;
}
