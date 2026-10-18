"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, Checkbox, Icon, Input } from "@/components/ui";
import { ApiError, session } from "@/lib/api";
import type { OrgView, Role, UserView } from "@/lib/types";

import { AUTH_SCENES, AuthHeading, AuthSplit, FormError } from "./AuthSplit";

const ROLES = [
  { id: "student", label: "Student", desc: "Courses, lessons and grades", icon: "graduation-cap", area: "/learn" },
  { id: "instructor", label: "Instructor", desc: "Teach, grade and track cohorts", icon: "presentation", area: "/teach" },
  { id: "admin", label: "Admin", desc: "People, seats and analytics", icon: "shield-check", area: "/admin" },
] as const;
type RoleId = (typeof ROLES)[number]["id"];

/** Areas each actual role can open. */
const ALLOWED: Record<Role, string[]> = {
  STUDENT: ["/learn"],
  INSTRUCTOR: ["/teach", "/learn"],
  ADMIN: ["/admin", "/teach", "/learn"],
};

interface SessionResult {
  user: UserView;
  organization: OrgView;
  role: Role;
  home: string;
}

/** Only same-site paths are followed after sign-in. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm({ org, ssoUrl }: { org: OrgView | null; ssoUrl?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("as") as RoleId) ?? "student";
  const [role, setRole] = useState<RoleId>(ROLES.some((r) => r.id === initial) ? initial : "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = ROLES.find((r) => r.id === role)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await session<SessionResult>("login", { orgSlug: org?.slug, email, password, remember });
      const next = safeNext(params.get("next"));
      const area = ALLOWED[res.role].includes(chosen.area) ? chosen.area : res.home;
      router.replace(next ?? area);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Try again.");
      setBusy(false);
    }
  }

  return (
    <AuthSplit image={AUTH_SCENES[role]}>
      <AuthHeading title="Welcome back" sub={<>Sign in to {org?.name ?? "your organization"} on Orbitly.</>} />
      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Sign in as">
        {ROLES.map((r) => {
          const a = r.id === role;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={a}
              aria-label={`${r.label}: ${r.desc}`}
              onClick={() => setRole(r.id)}
              style={{ textAlign: "left", padding: 14, borderRadius: 14, cursor: "pointer", background: a ? "var(--surface-card)" : "transparent", border: "1.5px solid " + (a ? `var(--role-${r.id})` : "var(--border-default)"), boxShadow: a ? "var(--shadow-md)" : "none", transition: "all 200ms var(--ease-out)" }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: `var(--role-${r.id}-soft)`, color: r.id === "admin" ? "var(--ink-900)" : `var(--role-${r.id})` }}>
                <Icon name={r.icon} size={18} />
              </span>
              <div style={{ font: "600 14px var(--font-display)", color: "var(--text-strong)", marginTop: 10 }}>{r.label}</div>
              <div style={{ font: "400 12px/16px var(--font-body)", color: "var(--text-muted)", marginTop: 2 }}>{r.desc}</div>
            </button>
          );
        })}
      </div>
      <form className="ob-enter-stagger flex flex-col gap-4" onSubmit={submit}>
        <FormError message={error} />
        <Input label="Email" iconLeft="mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" iconLeft="lock" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex items-center justify-between">
          <Checkbox label="Keep me signed in" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" fullWidth iconRight="arrow-right" loading={busy}>
          Sign in as {chosen.label.toLowerCase()}
        </Button>
        {ssoUrl && (
          <Button size="lg" fullWidth variant="secondary" iconLeft="key-round" href={ssoUrl}>
            Continue with university SSO
          </Button>
        )}
      </form>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
        New to {org?.name ?? "Orbitly"}? <Link href="/signup">Create a free account</Link>
      </p>
    </AuthSplit>
  );
}
