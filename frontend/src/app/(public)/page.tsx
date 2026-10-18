import Link from "next/link";
import { Fragment, type CSSProperties } from "react";

import { CountUp } from "@/components/motion";

import { HeroSearch } from "@/components/public/HeroSearch";
import { PopularCourses } from "@/components/public/PopularCourses";
import { Avatar, Badge, Button, Icon } from "@/components/ui";
import { count } from "@/lib/format";
import { getCategories, getReviews, searchCourses } from "@/lib/public-api";

const IMG = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=70&auto=format&fit=crop`;
const SCENES = {
  hero: "1522202176988-66273c2fd55f",
  learn: "1588072432836-e10032774350",
  teach: "1577896851231-70ef18881754",
  campus: "1541339907198-e08756dedf3f",
  laptop: "1513258496099-48168024aec0",
};

const HEADLINE = ["Learn", "the", "skills", "that"];
const HIGHLIGHT = ["move", "you", "forward."];
const vars = (v: Record<string, string | number>) => v as CSSProperties;

const ROLES = [
  { key: "student", img: SCENES.learn, icon: "graduation-cap", title: "Learn", text: "Enroll in any course, pick up where you left off and earn certificates.", cta: "Start learning", href: "/signup", variant: "primary" },
  { key: "instructor", img: SCENES.teach, icon: "presentation", title: "Teach", text: "Publish courses, grade work and see who needs help — and keep learning yourself.", cta: "Become an instructor", href: "/login?as=instructor", variant: "secondary" },
  { key: "admin", img: SCENES.campus, icon: "shield-check", title: "Run your institution", text: "Manage people, seats and analytics across every department.", cta: "Talk to us", href: "/login?as=admin", variant: "dark" },
] as const;

export default async function Landing() {
  const [categories, popular] = await Promise.all([getCategories(), searchCourses({ sort: "POPULAR", size: 60 })]);
  const courses = popular.items;
  const rated = courses.filter((c) => c.ratingCount > 0);
  const avgRating = rated.length ? rated.reduce((a, c) => a + Number(c.ratingAvg), 0) / rated.length : null;
  const instructors = new Set(courses.map((c) => c.instructorId)).size;
  const learners = courses.reduce((a, c) => a + c.enrollmentCount, 0);
  const topCourse = [...rated].sort((a, b) => Number(b.ratingAvg) - Number(a.ratingAvg))[0];
  const story = topCourse ? (await getReviews(topCourse.id)).list.find((r) => r.comment && r.rating >= 4) : undefined;

  return (
    <main>
      <section className="mx-auto grid max-w-[1240px] items-center gap-12 overflow-x-clip px-4 pb-10 pt-14 md:px-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          {learners > 0 && (
            <div className="ob-enter">
              <Badge tone="accent" dot>
                {count(learners)} enrollments and counting
              </Badge>
            </div>
          )}
          <h1 className="ob-words text-[40px] leading-[46px] md:text-[56px] md:leading-[62px]" style={{ fontWeight: 700, letterSpacing: "-0.035em", marginTop: 18 }}>
            {HEADLINE.map((w, i) => (
              <Fragment key={w}>
                <span className="ob-word" style={vars({ "--i": i })}>{w}</span>{" "}
              </Fragment>
            ))}
            <span className="ob-mark">
              {HIGHLIGHT.map((w, i) => (
                <Fragment key={w}>
                  {i > 0 && " "}
                  <span className="ob-word" style={vars({ "--i": HEADLINE.length + i })}>{w}</span>
                </Fragment>
              ))}
            </span>
          </h1>
          <p className="ob-enter" style={{ fontSize: 17, lineHeight: "28px", color: "var(--text-body)", margin: "18px 0 26px", maxWidth: 520, ...vars({ "--d": 650 }) }}>
            Expert-led courses in development, data, design and business. Learn at your pace, track your progress and earn certificates.
          </p>
          <div className="ob-enter" style={vars({ "--d": 800 })}>
            <HeroSearch />
          </div>
          <div className="ob-enter mt-[30px] flex gap-7" style={vars({ "--d": 950 })}>
            {[
              [String(popular.total), "courses"],
              [avgRating ? avgRating.toFixed(1) : "—", "average rating"],
              [String(instructors), "instructors"],
            ].map(([n, l], i) => (
              <div key={l}>
                <div style={{ font: "600 26px var(--font-display)", color: "var(--text-strong)", letterSpacing: "-0.02em" }}>
                  <CountUp value={n} delay={900 + i * 120} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ob-hero-art relative hidden h-[500px] md:block">
          {/* Large faint orbit behind the photo */}
          <div className="ob-orbit ob-orbit--rev" style={{ width: 560, height: 560, left: "calc(50% - 280px)", top: "calc(50% - 280px)", border: "1px dashed var(--orbit-200)", ...vars({ "--t": "90s" }) }}>
            <span className="ob-sat" style={{ left: "50%", top: 0, ...vars({ "--c": "var(--sky-500)", "--s": "9px" }) }} />
            <span className="ob-sat" style={{ left: "50%", top: "100%", ...vars({ "--c": "var(--amber-500)", "--s": "7px" }) }} />
          </div>
          {/* Coral planet with its own moon */}
          <div className="ob-orbit ob-orbit--drift" style={{ width: 180, height: 180, top: -14, right: -10, ...vars({ "--t": "16s" }) }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--coral-500)" }} />
          </div>
          <div className="ob-orbit ob-orbit--spin" style={{ width: 250, height: 250, top: -49, right: -45, border: "1px solid color-mix(in srgb, var(--coral-500) 30%, transparent)", ...vars({ "--t": "18s" }) }}>
            <span className="ob-sat ob-sat--pulse" style={{ left: "85.4%", top: "14.6%", ...vars({ "--s": "12px" }) }} />
          </div>
          {/* Outlined ring, bottom left */}
          <div className="ob-orbit ob-orbit--spin" style={{ width: 300, height: 300, bottom: -40, left: -50, border: "1.5px solid var(--orbit-200)", ...vars({ "--t": "40s" }) }}>
            <span className="ob-sat" style={{ left: "50%", top: 0, ...vars({ "--c": "var(--orbit-500)", "--s": "11px" }) }} />
            <span className="ob-sat" style={{ left: "100%", top: "50%", ...vars({ "--c": "var(--green-500)", "--s": "8px" }) }} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ob-hero-img" src={IMG(SCENES.hero, 1100, 1000)} alt="Students learning together" style={{ position: "absolute", inset: "20px 20px 40px 40px", width: "calc(100% - 60px)", height: "calc(100% - 60px)", objectFit: "cover", borderRadius: 28, boxShadow: "var(--shadow-lg)" }} />
          <div className="ob-float-in" style={{ position: "absolute", left: 0, top: 60, ...vars({ "--d": 700 }) }}>
            <div className="ob-float" style={{ padding: "12px 14px", borderRadius: 14, background: "#fff", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 10, ...vars({ "--t": "6s" }) }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--orbit-100)", color: "var(--orbit-700)" }}>
                <Icon name="users" size={18} />
              </span>
              <div>
                <div style={{ font: "600 13px var(--font-display)", color: "var(--text-strong)" }}>Learn with your cohort</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Live sessions, discussions and feedback</div>
              </div>
            </div>
          </div>
          <div className="ob-float-in" style={{ position: "absolute", right: 0, bottom: 0, width: 270, ...vars({ "--d": 900 }) }}>
            <div className="ob-float" style={{ padding: 14, borderRadius: 16, background: "#fff", boxShadow: "var(--shadow-lg)", display: "flex", gap: 12, alignItems: "center", ...vars({ "--t": "7s", "--delay": "-3s" }) }}>
              <span style={{ width: 40, height: 40, flex: "none", borderRadius: 12, display: "grid", placeItems: "center", background: "var(--green-100)", color: "var(--green-700)" }}>
                <Icon name="award" />
              </span>
              <div>
                <div style={{ font: "600 14px var(--font-display)", color: "var(--text-strong)" }}>Certificates you can share</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Verifiable on completion</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto mt-8 max-w-[1240px] px-4 md:px-10">
          <h2 className="ob-reveal" style={{ font: "600 26px var(--font-display)" }}>Explore by category</h2>
          <div className="ob-stagger mt-[18px] grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.id} href={`/courses?category=${c.slug}`} className="ob-card ob-card--interactive no-underline hover:no-underline" style={{ padding: 18, color: "inherit" }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `var(--${c.hue}-100)`, color: c.hue === "ink" ? "var(--ink-800)" : `var(--${c.hue}-700)` }}>
                  <Icon name={c.icon} />
                </span>
                <div style={{ font: "600 15px var(--font-display)", color: "var(--text-strong)", marginTop: 12 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {c.courseCount} {c.courseCount === 1 ? "course" : "courses"}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section className="ob-reveal mx-auto mt-14 max-w-[1240px] px-4 md:px-10">
          <PopularCourses categories={categories} courses={courses} />
        </section>
      )}

      <section className="mx-auto mt-16 max-w-[1240px] px-4 md:px-10">
        <h2 className="ob-reveal" style={{ font: "600 26px var(--font-display)", textAlign: "center" }}>One platform, three ways in</h2>
        <div className="ob-stagger mt-6 grid gap-[18px] md:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.key} className="ob-card ob-zoom" style={{ overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG(r.img, 720, 400)} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
              <div style={{ padding: 24 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: `var(--role-${r.key}-soft)`, color: r.key === "admin" ? "var(--ink-900)" : `var(--role-${r.key})` }}>
                  <Icon name={r.icon} />
                </span>
                <div style={{ font: "600 19px var(--font-display)", color: "var(--text-strong)", marginTop: 14 }}>{r.title}</div>
                <p style={{ margin: "6px 0 18px", color: "var(--text-muted)", lineHeight: "22px" }}>{r.text}</p>
                <Button variant={r.variant} iconRight="arrow-right" href={r.href}>
                  {r.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {story && topCourse && (
        <section className="mx-auto mt-16 max-w-[1240px] px-4 md:px-10">
          <div className="ob-reveal grid items-center gap-10 md:grid-cols-2" style={{ borderRadius: 24, background: "var(--orbit-100)", padding: 40 }}>
            <div>
              <div style={{ font: "600 11px/16px var(--font-body)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--orbit-700)" }}>Learner stories</div>
              <p style={{ font: "500 24px/34px var(--font-display)", color: "var(--ink-900)", margin: "12px 0 20px", letterSpacing: "-0.01em" }}>“{story.comment}”</p>
              <div className="flex items-center gap-3">
                <Avatar src={story.userAvatarUrl} name={story.userName} size={44} />
                <div>
                  <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>{story.userName}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Took {topCourse.title}</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG(SCENES.laptop, 600, 400)} alt="" style={{ gridColumn: "1 / -1", width: "100%", height: 200, objectFit: "cover", borderRadius: 16 }} />
              {[
                [String(popular.total), "courses to choose from"],
                [avgRating ? `${avgRating.toFixed(1)}/5` : "—", "average course rating"],
              ].map(([n, l]) => (
                <div key={l} style={{ background: "#fff", borderRadius: 16, padding: 18 }}>
                  <div style={{ font: "600 28px var(--font-display)", color: "var(--text-strong)", letterSpacing: "-0.02em" }}>
                    {n.endsWith("/5") ? <><CountUp value={n.slice(0, -2)} />/5</> : <CountUp value={n} />}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
