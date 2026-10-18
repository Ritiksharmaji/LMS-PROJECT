"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IconButton, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { WishlistEntry } from "@/lib/types";

export function useWishlist(enabled = true) {
  return useQuery({ queryKey: ["wishlist"], queryFn: () => api.get<WishlistEntry[]>("/me/wishlist"), enabled });
}

/** Heart toggle on course cards and pages (signed-in only). */
export function WishButton({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data } = useWishlist();
  const saved = !!data?.some((w) => w.course.id === courseId);
  const toggle = useMutation({
    mutationFn: () => (saved ? api.delete(`/me/wishlist/${courseId}`) : api.put(`/me/wishlist/${courseId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ tone: saved ? "info" : "success", title: saved ? "Removed from wishlist" : "Saved to your wishlist" });
    },
  });
  return (
    <IconButton
      icon="heart"
      label={saved ? "Remove from wishlist" : "Save to wishlist"}
      round
      variant="secondary"
      size="sm"
      onClick={() => toggle.mutate()}
      style={saved ? { color: "var(--coral-600)", background: "var(--surface-card)" } : { background: "var(--surface-card)" }}
      aria-pressed={saved}
    />
  );
}
