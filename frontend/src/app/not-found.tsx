import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6" style={{ background: "var(--bg-app)" }}>
      <div className="max-w-[440px] text-center">
        <div style={{ font: "700 26px/1 var(--font-display)", letterSpacing: "-0.04em", color: "var(--ink-900)" }}>
          orbitly<span style={{ color: "var(--coral-500)" }}>.</span>
        </div>
        <div style={{ font: "700 72px/1 var(--font-display)", letterSpacing: "-0.04em", color: "var(--coral-500)", marginTop: 36 }}>404</div>
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
