import type { Metadata } from "next";
import { Suspense } from "react";

import { AcceptInviteForm } from "@/components/auth/AuthForms";
import { API_URL } from "@/lib/config";
import type { InvitePreview } from "@/lib/types";

export const metadata: Metadata = { title: "Accept your invite", robots: { index: false } };

/** Invites are personal and single-use, so they're never cached. */
async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetch(`${API_URL}/api/auth/invites/${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
  const invite = res?.ok ? ((await res.json()) as InvitePreview) : null;
  return <AcceptInviteForm token={token} invite={invite} />;
}

export default function InvitePage(props: PageProps<"/invite/[token]">) {
  return (
    <Suspense>
      <Invite params={props.params} />
    </Suspense>
  );
}
