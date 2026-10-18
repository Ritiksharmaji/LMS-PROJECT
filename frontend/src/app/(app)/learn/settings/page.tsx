import type { Metadata } from "next";

import { SettingsPage } from "@/components/learn/AccountPages";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsPage />;
}
