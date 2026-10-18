import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge, Icon, Skeleton } from "@/components/ui";
import { date } from "@/lib/format";
import { getCertificate } from "@/lib/public-api";

export async function generateMetadata(props: PageProps<"/certificates/[code]">): Promise<Metadata> {
  const { code } = await props.params;
  const cert = await getCertificate(code);
  return cert ? { title: `${cert.learnerName} · ${cert.courseTitle}`, description: `Certificate of completion issued by ${cert.organizationName}` } : { title: "Certificate not found" };
}

export default function CertificatePage(props: PageProps<"/certificates/[code]">) {
  return (
    <main className="mx-auto max-w-[880px] px-4 pt-12 md:px-10">
      <Suspense fallback={<Skeleton height={480} style={{ borderRadius: 24 }} />}>
        <Certificate params={props.params} />
      </Suspense>
    </main>
  );
}

async function Certificate({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await getCertificate(code);
  if (!cert) notFound();
  return (
    <div className="ob-card relative overflow-hidden" style={{ padding: "56px 48px", textAlign: "center" }}>
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", border: "1.5px solid var(--orbit-200)", top: -180, right: -120 }} />
      <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", background: "var(--coral-100)", bottom: -60, left: -40 }} />
      <div className="relative">
        <Badge tone="success" dot>
          Verified certificate
        </Badge>
        <div className="ob-overline" style={{ marginTop: 28 }}>
          Certificate of completion
        </div>
        <h1 style={{ font: "700 40px/48px var(--font-display)", letterSpacing: "-0.03em", marginTop: 12 }}>{cert.learnerName}</h1>
        <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "14px 0 6px" }}>has successfully completed</p>
        <div style={{ font: "600 24px/32px var(--font-display)", color: "var(--text-strong)" }}>{cert.courseTitle}</div>
        <div className="mx-auto mt-10 grid max-w-[520px] grid-cols-3 gap-4" style={{ fontSize: 13 }}>
          {[
            ["Issued by", cert.organizationName],
            ["Completed", date(cert.completedAt)],
            ["Credential ID", cert.code],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: "var(--text-subtle)" }}>{k}</div>
              <div style={{ color: "var(--text-strong)", fontWeight: 600, marginTop: 2, wordBreak: "break-all" }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-center gap-2" style={{ color: "var(--text-muted)", fontSize: 13 }}>
          <Icon name="award" size={18} color="var(--coral-500)" />
          orbitly<span style={{ color: "var(--coral-500)", marginLeft: -6 }}>.</span>
        </div>
      </div>
    </div>
  );
}
