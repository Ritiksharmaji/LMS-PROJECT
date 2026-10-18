import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6" style={{ background: "var(--bg-app)" }}>
      <div className="ob-enter-stagger max-w-[440px] text-center">
        <div style={{ font: "700 26px/1 var(--font-display)", letterSpacing: "-0.04em", color: "var(--ink-900)" }}>
          orbitly<span className="ob-logo-dot" style={{ color: "var(--coral-500)" }}>.</span>
        </div>
        <div className="relative mx-auto grid place-items-center" style={{ width: 200, height: 200, marginTop: 24 }}>
          <div className="ob-orbit ob-orbit--spin" style={{ inset: 0, border: "1.5px dashed var(--orbit-200)", ["--t" as string]: "24s" }}>
            <span className="ob-sat ob-sat--pulse" style={{ left: "50%", top: 0, ["--s" as string]: "12px" }} />
          </div>
          <div className="ob-orbit ob-orbit--rev" style={{ inset: 30, border: "1px solid var(--coral-100)", ["--t" as string]: "16s" }}>
            <span className="ob-sat" style={{ left: "50%", top: "100%", ["--c" as string]: "var(--orbit-500)", ["--s" as string]: "8px" }} />
          </div>
          <div className="ob-float" style={{ font: "700 64px/1 var(--font-display)", letterSpacing: "-0.04em", color: "var(--coral-500)" }}>404</div>
        </div>
        <h1 style={{ font: "600 26px/34px var(--font-display)", marginTop: 12 }}>This page drifted out of orbit</h1>
        <p style={{ color: "var(--text-muted)", margin: "8px 0 24px" }}>The link may be old, or the course may have been archived.</p>
        <div className="flex justify-center gap-2.5">
          <Link href="/" className="ob-btn ob-btn--secondary ob-btn--md no-underline hover:no-underline">
            Home
          </Link>
          <Link href="/courses" className="ob-btn ob-btn--primary ob-btn--md no-underline hover:no-underline">
            Browse courses
          </Link>
        </div>
      </div>
    </main>
  );
}
