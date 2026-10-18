"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
import { Button, Input } from "@/components/ui";
import { useSessionRole } from "@/lib/use-session";

function home(role: string) {
  return role === "ADMIN" ? "/admin" : role === "INSTRUCTOR" ? "/teach" : "/learn";
}

export function Mark({ dark }: { dark?: boolean }) {
  return (
    <Link href="/" aria-label="Orbitly home" className="no-underline hover:no-underline" style={{ font: "700 26px/1 var(--font-display)", letterSpacing: "-0.04em", color: dark ? "#fff" : "var(--ink-900)" }}>
      orbitly<span className="ob-logo-dot" style={{ color: "var(--coral-500)" }}>.</span>
    </Link>
  );
}

function NavLinks({ active }: { active: boolean }) {
  const link = (label: string, href: string, on: boolean) => (
    <Link
      href={href}
      className="no-underline hover:no-underline"
      style={{ whiteSpace: "nowrap", font: "600 14px var(--font-body)", color: on ? "var(--text-strong)" : "var(--text-body)", padding: "8px 4px", borderBottom: "2px solid " + (on ? "var(--coral-500)" : "transparent") }}
    >
      {label}
    </Link>
  );
  return (
    <nav className="ob-hide-sm flex gap-5" aria-label="Main">
      {link("Courses", "/courses", active)}
      {link("Teach on Orbitly", "/login?as=instructor", false)}
      {link("For institutions", "/login?as=admin", false)}
    </nav>
  );
}

/** The pathname is request data on dynamic routes, so the active underline renders inside Suspense. */
function ActiveNavLinks() {
  return <NavLinks active={usePathname().startsWith("/courses")} />;
}

export function PublicNav() {
  const router = useRouter();
  const role = useSessionRole();
  const [q, setQ] = useState("");
  return (
    <header
      className="sticky top-0 z-10 flex h-[72px] items-center gap-7 px-4 md:px-10"
      style={{ background: "var(--bg-glass)", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <Mark />
      <Suspense fallback={<NavLinks active={false} />}>
        <ActiveNavLinks />
      </Suspense>
      <form
        className="ob-hide-md min-w-[160px] max-w-[420px] flex-1"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/courses${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        }}
      >
        <Input iconLeft="search" size="sm" placeholder="What do you want to learn?" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
      </form>
      <div className="flex-1" />
      <ThemeSwitch className="ob-hide-sm" />
      {role ? (
        <Button href={home(role)} iconRight="arrow-right">
          Go to dashboard
        </Button>
      ) : (
        <>
          <Button variant="ghost" href="/login" className="ob-hide-sm">
            Log in
          </Button>
          <Button href="/signup">Join for free</Button>
        </>
      )}
    </header>
  );
}
