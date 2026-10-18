"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "./api";
import type { EnrollmentView, MeResponse } from "./types";

/** Shared client queries (one cache entry each across the app). */
export function useMe(enabled = true) {
  return useQuery({ queryKey: ["me"], queryFn: () => api.get<MeResponse>("/me"), enabled, staleTime: 5 * 60_000 });
}

export function useEnrollments(enabled = true) {
  return useQuery({ queryKey: ["enrollments"], queryFn: () => api.get<EnrollmentView[]>("/me/enrollments"), enabled });
}
