import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

async function Form({ params }: { params: Promise<{ token: string }> }) {
  return <ResetPasswordForm token={(await params).token} />;
}

export default function ResetPasswordPage(props: PageProps<"/reset-password/[token]">) {
  return (
    <Suspense>
      <Form params={props.params} />
    </Suspense>
  );
}
