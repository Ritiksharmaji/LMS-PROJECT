import type { Metadata } from "next";
import { Suspense } from "react";

import { TestCheckout } from "@/components/checkout/CheckoutScreens";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton height={320} />}>
      <TestCheckout />
    </Suspense>
  );
}
