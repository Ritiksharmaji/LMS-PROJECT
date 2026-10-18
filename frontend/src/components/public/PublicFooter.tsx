import { cacheLife } from "next/cache";
import Link from "next/link";

import { Mark } from "./PublicNav";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export function PublicFooter() {
  const cols: [string, [string, string][]][] = [
    ["Learn", [["Browse courses", "/courses"], ["Free courses", "/courses?price=free"], ["Certificates", "/courses"]]],
    ["Teach", [["Become an instructor", "/login?as=instructor"], ["Instructor guide", "/login?as=instructor"], ["Payouts", "/login?as=instructor"]]],
    ["Company", [["About", "/"], ["Careers", "/"], ["Privacy", "/"], ["Accessibility", "/"]]],
  ];
  return (
    <footer style={{ background: "var(--night-950)", borderTop: "1px solid var(--night-edge)", color: "var(--night-300)", padding: "48px 40px 32px", marginTop: 72 }}>
      <div className="mx-auto grid max-w-[1240px] gap-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Mark dark />
          <p style={{ margin: "14px 0 0", maxWidth: 280, lineHeight: "22px" }}>Courses, cohorts and campuses in one orbit.</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <div style={{ color: "#fff", font: "600 14px var(--font-display)", marginBottom: 12 }}>{h}</div>
            {links.map(([label, href]) => (
              <Link key={label} href={href} className="block no-underline hover:text-white hover:no-underline" style={{ padding: "4px 0", color: "var(--night-300)" }}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-[1240px] pt-5" style={{ borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 12 }}>
        © <CopyrightYear /> Orbitly, Inc.
      </div>
    </footer>
  );
}
