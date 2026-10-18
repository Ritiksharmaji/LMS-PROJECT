import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { getOrganization } from "@/lib/public-api";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const org = await getOrganization();
  return (
    <Suspense>
      <LoginForm org={org} ssoUrl={process.env.NEXT_PUBLIC_SSO_URL} />
    </Suspense>
  );
}
