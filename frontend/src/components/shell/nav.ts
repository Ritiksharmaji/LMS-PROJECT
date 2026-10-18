import type { NavSection } from "@/components/ui";
import type { Role } from "@/lib/types";

const learn = (label: string): NavSection => ({
  label,
  items: [
    { href: "/learn/browse", label: "Browse courses", icon: "compass" },
    { href: "/learn/courses", label: "My learning", icon: "book-open" },
    { href: "/learn/wishlist", label: "Wishlist", icon: "heart" },
    { href: "/learn/schedule", label: "Schedule", icon: "calendar" },
    { href: "/learn/grades", label: "Grades", icon: "award" },
  ],
});

/** Sidebar sections per role (from the design's NAV), with live badges filled in by the shell. */
export function navFor(role: Role, badges: { toGrade?: number } = {}): NavSection[] {
  if (role === "STUDENT") {
    return [{ items: [{ href: "/learn", label: "Dashboard", icon: "layout-dashboard", exact: true }] }, learn("Learn")];
  }
  const teach: NavSection = {
    label: "Teach",
    items: [
      { href: "/teach", label: "Overview", icon: "layout-dashboard", exact: true },
      { href: "/teach/courses", label: "My courses", icon: "library" },
      { href: "/teach/grading", label: "Gradebook", icon: "clipboard-check", badge: badges.toGrade },
      { href: "/teach/schedule", label: "Live sessions", icon: "calendar-plus" },
    ],
  };
  if (role === "INSTRUCTOR") return [teach, learn("Learn")];
  return [
    {
      label: "Console",
      items: [
        { href: "/admin", label: "Analytics", icon: "chart-column", exact: true },
        { href: "/admin/people", label: "People", icon: "users" },
        { href: "/admin/catalog", label: "Course catalog", icon: "library" },
        { href: "/admin/orders", label: "Orders", icon: "receipt" },
        { href: "/admin/settings", label: "Organization", icon: "settings" },
      ],
    },
    teach,
    learn("Learn"),
  ];
}

/** Areas each role can switch between in the top bar. */
export const AREAS: Record<Role, { href: string; label: string; dot: string }[]> = {
  STUDENT: [],
  INSTRUCTOR: [
    { href: "/teach", label: "Teach", dot: "var(--role-instructor)" },
    { href: "/learn", label: "Learn", dot: "var(--role-student)" },
  ],
  ADMIN: [
    { href: "/admin", label: "Admin", dot: "var(--role-admin)" },
    { href: "/teach", label: "Teach", dot: "var(--role-instructor)" },
    { href: "/learn", label: "Learn", dot: "var(--role-student)" },
  ],
};
