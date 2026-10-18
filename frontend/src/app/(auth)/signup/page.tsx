import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/AuthForms";
import { getOrganization } from "@/lib/public-api";

export const metadata: Metadata = { title: "Join for free" };

export default async function SignupPage() {
  return <SignupForm org={await getOrganization()} />;
}
