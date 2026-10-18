import Link from "next/link";
import type { ReactNode } from "react";

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&h=1400&q=70&auto=format&fit=crop`;
export const AUTH_SCENES = {
  student: IMG("1523240795612-9a054b0db644"),
  instructor: IMG("1577896851231-70ef18881754"),
  admin: IMG("1541339907198-e08756dedf3f"),
} as const;

/** The split sign-in layout from the design: form on the left, photo and orbit shapes on the right. */
export function AuthSplit({ children, image = AUTH_SCENES.student, footer }: { children: ReactNode; image?: string; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2" style={{ background: "var(--bg-app)" }}>
      <div className="flex flex-col px-6 py-10 md:px-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="no-underline hover:no-underline" style={{ font: "700 26px/1 var(--font-display)", letterSpacing: "-0.04em", color: "var(--ink-900)" }}>
            orbitly<span style={{ color: "var(--coral-500)" }}>.</span>
          </Link>
          <Link href="/courses" className="ob-btn ob-btn--ghost ob-btn--sm no-underline hover:no-underline">
            ← Back to courses
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 py-10">{children}</div>
        <div style={{ font: "400 12px var(--font-body)", color: "var(--text-subtle)" }}>{footer ?? "© Orbitly · Privacy · Accessibility"}</div>
      </div>
      <div className="relative m-4 hidden flex-col justify-end overflow-hidden p-12 text-white lg:flex" style={{ borderRadius: 28, background: "var(--ink-950)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity 300ms" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(14,16,36,.92))" }} />
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1px solid rgba(255,255,255,.08)", top: -80, right: -120 }} />
        <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", top: 10, right: -30 }} />
        <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", background: "var(--coral-500)", top: 100, right: 60 }} />
        <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "var(--orbit-500)", top: 70, right: 320 }} />
        <div style={{ position: "relative", font: "600 40px/48px var(--font-display)", letterSpacing: "-0.03em", maxWidth: 460 }}>Every course, cohort and campus in one orbit.</div>
        <div style={{ position: "relative", marginTop: 14, color: "var(--ink-300)", fontSize: 15, maxWidth: 420, lineHeight: "24px" }}>
          Students pick up where they left off. Instructors see who needs help. Admins see the whole picture.
        </div>
      </div>
    </div>
  );
}

export function AuthHeading({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <h1 style={{ font: "600 34px/42px var(--font-display)", letterSpacing: "-0.03em" }}>{title}</h1>
      {sub && <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 15 }}>{sub}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--danger-soft)", color: "var(--danger-text)", fontSize: 13, fontWeight: 500 }}>
      {message}
    </div>
  );
}
