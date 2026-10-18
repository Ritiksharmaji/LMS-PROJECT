"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/components/ui";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="flex max-w-[520px] gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/courses${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
    >
      <Input iconLeft="search" size="lg" placeholder="Try “Python”, “UX research” or “SQL”" value={q} onChange={(e) => setQ(e.target.value)} containerStyle={{ flex: 1 }} aria-label="Search courses" />
      <Button size="lg" type="submit">
        Search
      </Button>
    </form>
  );
}
