import type { Metadata } from "next";
import { Suspense } from "react";

import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { robots: { index: false } };

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
