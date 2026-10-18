"use client";

import { useSyncExternalStore } from "react";

import { date, relative } from "@/lib/format";

// A shared minute clock: one interval for every timestamp on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = 0;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 60_000);
  }
  return () => {
    listeners.delete(onChange);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => now || (now = Date.now());
const getServerSnapshot = () => 0;

/**
 * "2h ago" computed in the browser. The server (and hydration) shows the calendar date, so prerendered HTML is
 * stable and still meaningful.
 */
export function RelativeTime({ iso }: { iso: string | null | undefined }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!iso) return <>—</>;
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en-US")}>
      {current === 0 ? date(iso) : relative(iso, current)}
    </time>
  );
}
