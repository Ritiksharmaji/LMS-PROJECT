"use client";

import { useSyncExternalStore } from "react";

import type { Role } from "./types";

function read(): Role | null {
  const match = document.cookie.match(/(?:^|;\s*)orb_role=([^;]+)/);
  return match ? (decodeURIComponent(match[1]) as Role) : null;
}

const subscribe = () => () => {};

/**
 * The signed-in role from the readable `orb_role` cookie, or null. Server render and hydration see `undefined`
 * (unknown), so session-dependent UI renders after mount without hydration mismatches.
 */
export function useSessionRole(): Role | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
