import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, Badge, Card, Icon, LessonItem, ProgressBar, RelativeTime } from "@/components/ui";
import { count, duration, level } from "@/lib/format";
import { getCourse, getOrganization, getReviews, searchCourses } from "@/lib/public-api";

import { CourseActions } from "./CourseActions";
import { CourseGrid } from "./CourseGrid";
import { CourseTabs } from "./CourseTabs";

/** The course page body, shared by the public site and the signed-in "Browse courses" area. */
export async function CourseDetailView({ slug, orgSlug, basePath = "/courses" }: { slug: string; orgSlug?: string; basePath?: string }) {
  const detail = await getCourse(slug, orgSlug);
  if (!detail) notFound();
  const { course: c, curriculum, instructor, category, outcomes, description } = detail;
  const [org, reviews, related] = await Promise.all([
    getOrganization(orgSlug),
    getReviews(c.id, orgSlug),
    searchCourses({ category: category?.slug, sort: "POPULAR", size: 6 }, orgSlug),
  ]);
  const others = related.items.filter((x) => x.id !== c.id);
  const fill = others.length < 3 ? (await searchCourses({ sort: "POPULAR", size: 8 }, orgSlug)).items.filter((x) => x.id !== c.id && !others.some((o) => o.id === x.id)) : [];
  const alsoTook = [...others, ...fill].slice(0, 3);
  const summary = reviews.summary;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.tagline,
    provider: { "@type": "Organization", name: org?.name ?? "Orbitly" },
    ...(summary && summary.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: summary.average.toFixed(1), reviewCount: summary.count } } : {}),
    offers: { "@type": "Offer", price: (c.priceCents / 100).toFixed(2), priceCurrency: c.currency, category: c.priceCents ? "Paid" : "Free" },
  };

  const curriculumPane = (
    <div className="flex flex-col gap-3.5">
      {curriculum.map((s, si) => (
        <Card key={s.id} padding="8px">
          <div className="flex justify-between" style={{ padding: "10px 12px 6px" }}>
            <span style={{ font: "600 15px var(--font-display)", color: "var(--text-strong)" }}>
              {si + 1}. {s.title}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.lessons.length} lessons</span>
          </div>
          {s.lessons.map((l, li) => (
            <LessonItem key={l.id} index={li + 1} title={l.title} kind={l.kind} duration={l.kind === "QUIZ" ? "Quick check" : l.kind === "ASSIGNMENT" ? "Graded" : `${l.durationMinutes} min`} status={l.preview ? "todo" : "locked"} />
          ))}
        </Card>
      ))}
    </div>
  );

  const overviewPane = (
    <div>
      {outcomes.length > 0 && (
        <>
          <h3 style={{ font: "600 18px var(--font-display)", marginBottom: 14 }}>What you’ll learn</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {outcomes.map((t) => (
              <div key={t} className="flex gap-2.5">
                <Icon name="check" size={18} color="var(--success)" />
                {t}
              </div>
            ))}
          </div>
        </>
      )}
      {description && (
        <div className="ob-prose" style={{ marginTop: 20 }}>
          {description.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );

  const instructorPane = instructor && (
    <div className="flex gap-[18px]">
      <Avatar src={instructor.avatarUrl} name={instructor.fullName} size={72} />
      <div>
        <div style={{ font: "600 19px var(--font-display)", color: "var(--text-strong)" }}>{instructor.fullName}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, margin: "2px 0 10px" }}>
          {category ? `${category.name} faculty · ` : ""}
          {instructor.publishedCourses} {instructor.publishedCourses === 1 ? "course" : "courses"} on Orbitly
        </div>
        <p style={{ margin: 0, lineHeight: "24px", maxWidth: 560 }}>Teaches with worked examples and real data. Ask questions in the course discussion and join live sessions as an enrolled learner.</p>
      </div>
    </div>
  );

  const reviewsPane = (
    <div className="grid gap-7 md:grid-cols-[180px_1fr]">
      <div>
        <div style={{ font: "700 48px var(--font-display)", color: "var(--text-strong)", letterSpacing: "-0.03em" }}>{summary && summary.count ? summary.average.toFixed(1) : "—"}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Course rating</div>
        {[5, 4, 3, 2, 1].map((s) => {
          const n = summary?.histogram[String(s)] ?? 0;
          const pct = summary && summary.count ? Math.round((n * 100) / summary.count) : 0;
          return (
            <div key={s} className="mb-1.5 flex items-center gap-2" style={{ fontSize: 12 }}>
              {s}
              <Icon name="star" size={12} color="var(--amber-500)" />
              <ProgressBar value={pct} height={6} color="var(--amber-500)" style={{ flex: 1 }} />
              {pct}%
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-[18px]">
        {reviews.list.length === 0 && <p style={{ color: "var(--text-muted)" }}>No reviews yet. Enrolled learners can leave one from the course player.</p>}
        {reviews.list.map((r) => (
          <div key={r.id} className="flex gap-3">
            <Avatar src={r.userAvatarUrl} name={r.userName} size={36} />
            <div>
              <div style={{ font: "600 14px var(--font-body)", color: "var(--text-strong)" }}>
                {r.userName}
                <span style={{ fontWeight: 400, color: "var(--text-subtle)", fontSize: 12, marginLeft: 6 }}>
                  {r.rating}/5 · <RelativeTime iso={r.createdAt} />
                </span>
              </div>
              {r.comment && <div style={{ marginTop: 4, lineHeight: "22px" }}>{r.comment}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="relative grid gap-9 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]" style={{ borderRadius: 24, background: "var(--ink-950)", color: "#fff", padding: "32px 36px" }}>
        <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", border: "1px solid rgba(255,255,255,.07)", right: 200, top: -200 }} />
        <div className="relative">
          <div className="flex items-center gap-1.5" style={{ fontSize: 13, color: "var(--ink-300)" }}>
            {category ? (
              <Link href={`${basePath}?category=${category.slug}`} style={{ color: "var(--ink-300)" }}>
                {category.name}
              </Link>
            ) : (
              <Link href={basePath} style={{ color: "var(--ink-300)" }}>
                Courses
              </Link>
            )}
            <Icon name="chevron-right" size={14} />
            {level(c.level)}
          </div>
          <h1 style={{ font: "600 34px/42px var(--font-display)", letterSpacing: "-0.025em", color: "#fff", marginTop: 12 }}>{c.title}</h1>
          {c.tagline && <p style={{ fontSize: 16, lineHeight: "26px", color: "var(--ink-200)", margin: "10px 0 18px", maxWidth: 560 }}>{c.tagline}</p>}
          <div className="flex flex-wrap items-center gap-[18px]" style={{ fontSize: 13, color: "var(--ink-200)" }}>
            {c.featured && <Badge tone="accent">Bestseller</Badge>}
            {c.ratingCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Icon name="star" size={15} color="var(--amber-500)" style={{ fill: "var(--amber-500)" }} />
                <b style={{ color: "#fff" }}>{Number(c.ratingAvg).toFixed(1)}</b>
                <span>({count(c.ratingCount)} reviews)</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Icon name="users" size={15} />
              {count(c.enrollmentCount)} learners
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={15} />
              {duration(c.durationMinutes)}
            </span>
          </div>
          {instructor && (
            <div className="mt-5 flex items-center gap-2.5">
              <Avatar src={instructor.avatarUrl} name={instructor.fullName} size={32} />
              <span style={{ fontSize: 14 }}>
                Created by <b style={{ color: "#fff" }}>{instructor.fullName}</b>
              </span>
            </div>
          )}
        </div>
        <div className="relative self-start overflow-hidden" style={{ background: "#fff", borderRadius: 18, color: "var(--text-body)", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ position: "relative", aspectRatio: "16/9", background: `var(--${c.hue}-100)`, color: `var(--${c.hue}-500)`, display: "grid", placeItems: "center" }}>
            {c.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Icon name={c.icon} size={44} />
            )}
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "linear-gradient(transparent 40%, rgba(14,16,36,.55))" }}>
              <span style={{ width: 56, height: 56, borderRadius: 99, background: "rgba(255,255,255,.95)", display: "grid", placeItems: "center", color: "var(--ink-900)", boxShadow: "var(--shadow-md)" }}>
                <Icon name="play" size={22} />
              </span>
            </span>
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", color: "#fff", font: "600 13px var(--font-body)" }}>Preview this course</span>
          </div>
          <CourseActions course={c} orgName={org?.name ?? "your organization"} />
        </div>
      </div>
      <div className="mt-6 lg:max-w-[calc(100%-376px)]">
        <CourseTabs lessons={c.lessonCount} reviews={c.ratingCount} panes={{ curriculum: curriculumPane, overview: overviewPane, instructor: instructorPane, reviews: reviewsPane }} />
        {alsoTook.length > 0 && (
          <>
            <h3 style={{ font: "600 18px var(--font-display)", margin: "36px 0 14px" }}>Learners also took</h3>
            <CourseGrid courses={alsoTook} basePath={basePath} />
          </>
        )}
      </div>
    </div>
  );
}
