"use client";

import { useEffect } from "react";

import { Button, Icon } from "@/components/ui";

/** Shown when a page throws while rendering. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="ob-card mx-auto my-16 max-w-[480px] text-center" style={{ padding: 40 }}>
      <span style={{ width: 52, height: 52, margin: "0 auto", borderRadius: 16, display: "grid", placeItems: "center", background: "var(--danger-soft)", color: "var(--danger-text)" }}>
        <Icon name="triangle-alert" size={26} />
      </span>
      <h1 style={{ font: "600 22px/30px var(--font-display)", marginTop: 16 }}>Something went wrong</h1>
      <p style={{ color: "var(--text-muted)", margin: "6px 0 22px" }}>Try again. If it keeps happening, the service may be briefly unavailable.</p>
      <div className="flex justify-center gap-2.5">
        <Button variant="secondary" href="/">
          Home
        </Button>
        <Button iconLeft="rotate-ccw" onClick={reset}>
          Try again
        </Button>
      </div>
      {error.digest && <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-subtle)" }}>Reference {error.digest}</div>}
    </div>
  );
}
