"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Badge, Button, CourseCard, EmptyState, ErrorState, PageHead, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { cardProps } from "@/lib/course";
import { useMe } from "@/lib/queries";
import type { CourseCard as Course, CourseStatus } from "@/lib/types";

import { CreateCourseDialog } from "./CreateCourseDialog";

const STATUS_BADGE: Record<CourseStatus, [string, "success" | "neutral" | "warning"]> = { PUBLISHED: ["Live", "success"], DRAFT: ["Draft", "neutral"], ARCHIVED: ["Archived", "warning"] };

export function TeachCourses() {
  const me = useMe();
  const [create, setCreate] = useState(false);
  const [status, setStatus] = useState<"ALL" | CourseStatus>("ALL");
  const courses = useQuery({ queryKey: ["instructor-courses"], queryFn: () => api.get<Course[]>("/instructor/courses") });
  if (courses.error) return <ErrorState message={courses.error.message} onRetry={() => courses.refetch()} />;
  const all = courses.data ?? [];
  const list = status === "ALL" ? all : all.filter((c) => c.status === status);
  const n = (s: CourseStatus) => all.filter((c) => c.status === s).length;
  return (
    <div>
      <PageHead
        title={me.data?.role === "ADMIN" ? "All courses" : "My courses"}
        sub={me.data?.role === "ADMIN" ? "Every course in your organization" : "Courses you teach"}
        actions={
          <Button iconLeft="plus" onClick={() => setCreate(true)}>
            New course
          </Button>
        }
      />
      <Tabs
        value={status}
        onChange={setStatus}
        items={[
          { label: "All", value: "ALL", count: all.length },
          { label: "Live", value: "PUBLISHED", count: n("PUBLISHED") },
          { label: "Drafts", value: "DRAFT", count: n("DRAFT") },
          { label: "Archived", value: "ARCHIVED", count: n("ARCHIVED") },
        ]}
        style={{ marginBottom: 20 }}
      />
      {courses.isLoading ? (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={320} />
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState icon="book-plus" title="No courses here" message="Create a draft, add lessons, then publish it to the catalog." action={<Button onClick={() => setCreate(true)}>Create a course</Button>} />
      ) : (
        <div className="ob-stagger grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const [label, tone] = STATUS_BADGE[c.status];
            return <CourseCard key={c.id} {...cardProps(c)} href={`/teach/courses/${c.id}`} badge={<Badge tone={tone} dot>{label}</Badge>} />;
          })}
        </div>
      )}
      <CreateCourseDialog open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
