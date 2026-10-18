import type { Metadata } from "next";

import { Showcase } from "./showcase";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

export default function DesignSystemPage() {
  return <Showcase />;
}
