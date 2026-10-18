import type { Metadata } from "next";

import { MyLearning } from "@/components/learn/MyLearning";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return <MyLearning tab="wish" />;
}
