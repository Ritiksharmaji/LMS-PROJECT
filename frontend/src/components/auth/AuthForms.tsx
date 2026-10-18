"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Input } from "@/components/ui";
import { ApiError, session } from "@/lib/api";
import { role as roleLabel } from "@/lib/format";
import type { InvitePreview, OrgView } from "@/lib/types";

import { AUTH_SCENES, AuthHeading, AuthSplit, FormError } from "./AuthSplit";

type Fields = Record<string, string>;

/** Shared submit handling: shows the API's message and per-field errors. */
function useSubmit<T>(action: (fields: Fields) => Promise<T>, onDone: (r: T) => void) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget)) as Fields;
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      onDone(await action(fields));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }
  return { submit, error, fieldErrors, busy };
}

function useGoHome() {
  const router = useRouter();
  return (r: { home: string }) => {
    router.replace(r.home);
    router.refresh();
  };
}

export function SignupForm({ org }: { org: OrgView | null }) {
  const goHome = useGoHome();
  const { submit, error, fieldErrors: f, busy } = useSubmit((v) => session<{ home: string }>("signup", { orgSlug: org?.slug, fullName: v.fullName, email: v.email, password: v.password }), goHome);
  return (
    <AuthSplit image={AUTH_SCENES.student}>
      <AuthHeading title="Join for free" sub={<>Create your learner account at {org?.name ?? "Orbitly"}.</>} />
      <form className="ob-enter-stagger flex flex-col gap-4" onSubmit={submit}>
        <FormError message={error} />
        <Input name="fullName" label="Full name" iconLeft="user" autoComplete="name" required error={f.fullName} />
        <Input name="email" label="Email" iconLeft="mail" type="email" autoComplete="email" required error={f.email} />
        <Input name="password" label="Password" iconLeft="lock" type="password" autoComplete="new-password" minLength={8} required error={f.password} help="At least 8 characters" />
        <Button type="submit" size="lg" fullWidth iconRight="arrow-right" loading={busy}>
          Create account
        </Button>
      </form>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
        Already have an account? <Link href="/login">Sign in</Link>
        <br />
        Setting up a school or company? <Link href="/register">Create an organization</Link>
      </p>
    </AuthSplit>
  );
}

export function RegisterForm() {
  const goHome = useGoHome();
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const { submit, error, fieldErrors: f, busy } = useSubmit(
    (v) => session<{ home: string }>("register", { orgName: v.orgName, orgSlug: v.orgSlug, fullName: v.fullName, email: v.email, password: v.password }),
    goHome,
  );
  return (
    <AuthSplit image={AUTH_SCENES.admin}>
      <AuthHeading title="Create your organization" sub="Bring your courses, people and analytics into one place. You'll be its first admin." />
      <form className="ob-enter-stagger flex flex-col gap-4" onSubmit={submit}>
        <FormError message={error} />
        <Input
          name="orgName"
          label="Organization name"
          iconLeft="building-2"
          required
          error={f.orgName}
          onChange={(e) => !touched && setSlug(e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80))}
        />
        <Input name="orgSlug" label="Organization URL" iconLeft="link" required value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} error={f.orgSlug} help="Lowercase letters, numbers and dashes" />
        <Input name="fullName" label="Your name" iconLeft="user" autoComplete="name" required error={f.fullName} />
        <Input name="email" label="Work email" iconLeft="mail" type="email" autoComplete="email" required error={f.email} />
        <Input name="password" label="Password" iconLeft="lock" type="password" autoComplete="new-password" minLength={8} required error={f.password} />
        <Button type="submit" size="lg" fullWidth variant="dark" iconRight="arrow-right" loading={busy}>
          Create organization
        </Button>
      </form>
    </AuthSplit>
  );
}

export function AcceptInviteForm({ token, invite }: { token: string; invite: InvitePreview | null }) {
  const goHome = useGoHome();
  const { submit, error, fieldErrors: f, busy } = useSubmit((v) => session<{ home: string }>("accept-invite", { token, fullName: v.fullName, password: v.password }), goHome);
  if (!invite) {
    return (
      <AuthSplit>
        <AuthHeading title="This invite can't be used" sub="It may have expired or already been accepted. Ask your admin to send a new one." />
        <Button href="/login" variant="secondary" iconLeft="arrow-left">
          Go to sign in
        </Button>
      </AuthSplit>
    );
  }
  const r = invite.role.toLowerCase() as "student" | "instructor" | "admin";
  return (
    <AuthSplit image={AUTH_SCENES[r]}>
      <div>
        <Badge tone={r === "student" ? "accent" : r === "instructor" ? "orbit" : "dark"} dot>
          Invited as {roleLabel(invite.role).toLowerCase()}
        </Badge>
        <div style={{ marginTop: 14 }}>
          <AuthHeading title={`Join ${invite.organization.name}`} sub={invite.existingAccount ? <>You already have an Orbitly account as {invite.email}. Confirm your password to join.</> : <>Set up your account for {invite.email}.</>} />
        </div>
      </div>
      <form className="ob-enter-stagger flex flex-col gap-4" onSubmit={submit}>
        <FormError message={error} />
        {!invite.existingAccount && <Input name="fullName" label="Full name" iconLeft="user" autoComplete="name" required error={f.fullName} />}
        <Input name="password" label={invite.existingAccount ? "Your password" : "Choose a password"} iconLeft="lock" type="password" autoComplete={invite.existingAccount ? "current-password" : "new-password"} minLength={8} required error={f.password} />
        <Button type="submit" size="lg" fullWidth iconRight="arrow-right" loading={busy}>
          Accept invite
        </Button>
      </form>
    </AuthSplit>
  );
}

async function post(path: string, body: unknown) {
  const res = await fetch(`/api/backend${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    throw new ApiError({ status: res.status, code: p.code ?? "error", detail: p.detail ?? "Request failed", errors: p.errors });
  }
}

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { submit, error, fieldErrors: f, busy } = useSubmit(
    async (v) => {
      await post("/auth/password/forgot", { email: v.email });
      return v.email;
    },
    setSentTo,
  );
  return (
    <AuthSplit>
      {sentTo ? (
        <>
          <AuthHeading title="Check your inbox" sub={<>If {sentTo} has an Orbitly account, a reset link is on its way. It works for one hour.</>} />
          <Button href="/login" variant="secondary" iconLeft="arrow-left">
            Back to sign in
          </Button>
        </>
      ) : (
        <>
          <AuthHeading title="Forgot your password?" sub="Enter your email and we'll send you a link to choose a new one." />
          <form className="ob-enter-stagger flex flex-col gap-4" onSubmit={submit}>
            <FormError message={error} />
            <Input name="email" label="Email" iconLeft="mail" type="email" autoComplete="email" required error={f.email} />
            <Button type="submit" size="lg" fullWidth iconRight="send" loading={busy}>
              Send reset link
            </Button>
          </form>
          <Link href="/login">Back to sign in</Link>
        </>
      )}
    </AuthSplit>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const { submit, error, fieldErrors: f, busy } = useSubmit(
    async (v) => {
      if (v.password !== v.confirm) throw new ApiError({ status: 400, code: "mismatch", detail: "The passwords don't match" });
      await post("/auth/password/reset", { token, password: v.password });
    },
    () => setDone(true),
  );
  return (
    <AuthSplit>
      {done ? (
        <>
          <AuthHeading title="Password updated" sub="You've been signed out everywhere. Sign in with your new password." />
          <Button href="/login" size="lg" iconRight="arrow-right">
            Sign in
          </Button>
        </>
      ) : (
        <>
          <AuthHeading title="Choose a new password" />
          <form className="ob-enter-stagger flex flex-col gap-4" onSubmit={submit}>
            <FormError message={error} />
            <Input name="password" label="New password" iconLeft="lock" type="password" autoComplete="new-password" minLength={8} required error={f.password} help="At least 8 characters" />
            <Input name="confirm" label="Repeat password" iconLeft="lock" type="password" autoComplete="new-password" minLength={8} required />
            <Button type="submit" size="lg" fullWidth loading={busy}>
              Update password
            </Button>
          </form>
        </>
      )}
    </AuthSplit>
  );
}
