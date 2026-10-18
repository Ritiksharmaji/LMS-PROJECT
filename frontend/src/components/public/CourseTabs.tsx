"use client";

import { useState, type ReactNode } from "react";

import { Tabs } from "@/components/ui";

type Key = "curriculum" | "overview" | "instructor" | "reviews";

/** Switches between server-rendered panes. Every pane stays in the HTML so search engines see all of it. */
export function CourseTabs({ panes, lessons, reviews }: { panes: Record<Key, ReactNode>; lessons: number; reviews: number }) {
  const [tab, setTab] = useState<Key>("curriculum");
  return (
    <div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { label: "Curriculum", value: "curriculum", count: lessons },
          { label: "Overview", value: "overview" },
          { label: "Instructor", value: "instructor" },
          { label: "Reviews", value: "reviews", count: reviews },
        ]}
      />
      {(Object.keys(panes) as Key[]).map((k) => (
        <div key={k} role="tabpanel" hidden={tab !== k} style={{ paddingTop: 20 }}>
          {panes[k]}
        </div>
      ))}
    </div>
  );
}
