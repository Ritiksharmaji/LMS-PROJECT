"use client";

import { useRouter } from "next/navigation";

import { useWishlist } from "@/components/public/WishButton";
import { CourseGrid } from "@/components/public/CourseGrid";
import { Badge, Button, CourseCard, EmptyState, ErrorState, PageHead, Skeleton, Tabs } from "@/components/ui";
import { cardProps, playerHref } from "@/lib/course";
import { useEnrollments, useMe } from "@/lib/queries";

type Tab = "progress" | "done" | "wish";

export function MyLearning({ tab }: { tab: Tab }) {
  const router = useRouter();
  const me = useMe();
  const enrollments = useEnrollments();
  const wishlist = useWishlist();
  const all = enrollments.data ?? [];
  const inProgress = all.filter((e) => e.status === "ACTIVE");
  const done = all.filter((e) => e.status === "COMPLETED");
  const wish = wishlist.data ?? [];
  const go = (t: Tab) => router.push(t === "wish" ? "/learn/wishlist" : t === "done" ? "/learn/courses?tab=completed" : "/learn/courses");
  const staff = me.data && me.data.role !== "STUDENT";

  if (enrollments.error) return <ErrorState message={enrollments.error.message} onRetry={() => enrollments.refetch()} />;
  const loading = enrollments.isLoading || (tab === "wish" && wishlist.isLoading);
  const list = tab === "progress" ? inProgress : done;

  return (
    <div>
      <PageHead
        title={tab === "wish" ? "Wishlist" : "My learning"}
        sub={staff ? "Courses you’re taking as a learner" : `${all.length} enrolled`}
        actions={
          <Button variant="secondary" iconLeft="compass" href="/learn/browse">
            Browse courses
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={go}
        items={[
          { label: "In progress", value: "progress", count: inProgress.length },
          { label: "Completed", value: "done", count: done.length },
          { label: "Wishlist", value: "wish", count: wish.length },
        ]}
        style={{ marginBottom: 20 }}
      />
      {loading ? (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={330} />
          ))}
        </div>
      ) : tab === "wish" ? (
        wish.length ? (
          <CourseGrid courses={wish.map((w) => w.course)} basePath="/learn/browse" />
        ) : (
          <EmptyState icon="heart" title="Your wishlist is empty" message="Find a course you like in the catalog." action={<Button href="/learn/browse">Browse courses</Button>} />
        )
      ) : list.length ? (
        <div className="ob-stagger grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <CourseCard
              key={e.id}
              {...cardProps(e.course)}
              price={null}
              progress={e.progress.percent}
              badge={e.status === "COMPLETED" ? <Badge tone="success" dot>Completed</Badge> : e.source === "ASSIGNED" ? <Badge tone="info">Assigned</Badge> : null}
              href={playerHref(e.course.id, e.lastLessonId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing here yet" message={tab === "done" ? "Finish a course to see it here, with its certificate." : "Find a course you like in the catalog."} action={<Button href="/learn/browse">Browse courses</Button>} />
      )}
    </div>
  );
}
