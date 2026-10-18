"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button, Icon, ProgressBar, Skeleton, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { courseHref, playerHref } from "@/lib/course";
import { duration, price } from "@/lib/format";
import { useEnrollments, useMe } from "@/lib/queries";
import type { CheckoutResponse, CourseCard, EnrollmentView } from "@/lib/types";
import { useSessionRole } from "@/lib/use-session";

import { useWishlist } from "./WishButton";

/** The white purchase/enroll card on the course page. */
export function CourseActions({ course, orgName }: { course: CourseCard; orgName: string }) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const role = useSessionRole();
  const signedIn = !!role;
  const me = useMe(signedIn);
  const enrollments = useEnrollments(signedIn);
  const wishlist = useWishlist(signedIn);

  const enrollment = enrollments.data?.find((e) => e.course.id === course.id);
  const teaches = me.data?.user.id === course.instructorId;
  const staff = role === "INSTRUCTOR" || role === "ADMIN";
  const free = course.priceCents === 0 || staff;
  const saved = !!wishlist.data?.some((w) => w.course.id === course.id);

  const enroll = useMutation({
    mutationFn: () => api.post<EnrollmentView>("/me/enrollments", { courseId: course.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      toast({ title: "You're enrolled", message: course.title });
      router.push(playerHref(course.id));
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't enroll", message: e.message }),
  });
  const checkout = useMutation({
    mutationFn: () => api.post<CheckoutResponse>("/me/checkout", { courseId: course.id }),
    onSuccess: (res) => {
      // Hosted checkout (Stripe) lives on another origin; the test provider is a page in this app.
      window.location.assign(res.checkoutUrl);
    },
    onError: (e) => toast({ tone: "danger", title: "Couldn't start checkout", message: e instanceof ApiError ? e.message : "Try again" }),
  });
  const wish = useMutation({
    mutationFn: () => (saved ? api.delete(`/me/wishlist/${course.id}`) : api.put(`/me/wishlist/${course.id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const loading = role === undefined || (signedIn && (me.isLoading || enrollments.isLoading));
  const progress = enrollment?.progress.percent ?? 0;

  let cta: React.ReactNode;
  if (loading) {
    cta = <Skeleton height={48} />;
  } else if (!signedIn) {
    cta = (
      <Button size="lg" fullWidth iconRight="arrow-right" href={`/login?next=${encodeURIComponent(courseHref(course))}`}>
        {course.priceCents === 0 ? "Enroll for free" : "Buy now"}
      </Button>
    );
  } else if (teaches) {
    cta = (
      <Button size="lg" fullWidth variant="dark" iconRight="arrow-right" href={`/teach/courses/${course.id}`}>
        Manage course
      </Button>
    );
  } else if (enrollment) {
    cta = (
      <Button size="lg" fullWidth iconRight="arrow-right" href={playerHref(course.id, enrollment.lastLessonId)}>
        {progress > 0 ? "Continue learning" : "Start course"}
      </Button>
    );
  } else if (free) {
    cta = (
      <Button size="lg" fullWidth iconRight="arrow-right" loading={enroll.isPending} onClick={() => enroll.mutate()}>
        Enroll for free
      </Button>
    );
  } else {
    cta = (
      <Button size="lg" fullWidth iconLeft="lock" loading={checkout.isPending} onClick={() => checkout.mutate()}>
        Buy now
      </Button>
    );
  }

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {enrollment ? (
        <ProgressBar value={progress} showValue label="Your progress" color={progress >= 100 ? "var(--success)" : undefined} />
      ) : (
        <div style={{ font: "700 28px var(--font-display)", color: "var(--text-strong)", letterSpacing: "-0.02em" }}>
          {staff && course.priceCents > 0 && !loading ? (
            <>
              Free <span style={{ font: "500 14px var(--font-body)", color: "var(--text-muted)", textDecoration: "line-through" }}>{price(course.priceCents, course.currency)}</span>
            </>
          ) : (
            price(course.priceCents, course.currency)
          )}
        </div>
      )}
      {cta}
      {signedIn && !enrollment && !teaches && !loading && (
        <Button fullWidth variant="secondary" iconLeft="heart" loading={wish.isPending} onClick={() => wish.mutate()} style={saved ? { color: "var(--coral-700)" } : undefined}>
          {saved ? "In your wishlist" : "Add to wishlist"}
        </Button>
      )}
      {staff && !teaches && !enrollment && course.priceCents > 0 && !loading && (
        <div style={{ fontSize: 12, color: "var(--orbit-700)", background: "var(--orbit-100)", padding: "8px 10px", borderRadius: 8 }}>
          Free for {orgName} {role === "ADMIN" ? "admins" : "instructors"}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 6, fontSize: 13 }}>
        {(
          [
            ["circle-play", `${course.lessonCount} lessons · ${duration(course.durationMinutes)}`],
            ["file-text", "Readings and downloadable notes"],
            ["clipboard-check", "Quizzes and a graded project"],
            ["award", "Certificate of completion"],
            ["infinity", "Lifetime access"],
          ] as const
        ).map(([i, t]) => (
          <span key={t} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name={i} size={16} color="var(--ink-500)" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
