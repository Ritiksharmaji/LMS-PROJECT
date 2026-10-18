#!/usr/bin/env node
/**
 * Seeds a demo organization ("Northfield University") through the public API, using the catalog from the
 * Orbitly Portal design: instructors, students, 12 courses with curricula, quizzes, an assignment, enrollments,
 * progress, reviews, live sessions and a discussion.
 *
 *   API_URL=http://localhost:8080 node scripts/seed-demo.mjs
 *
 * Demo accounts (all use DEMO_PASSWORD below) — these are local test credentials only:
 *   admin       ada@northfield.demo
 *   instructor  lena.park@northfield.demo   (and the other instructors below)
 *   student     maya.okafor@northfield.demo (and the other students below)
 */

const API = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const ORG = process.env.ORG_SLUG ?? "northfield";
const DEMO_PASSWORD = "orbitly-demo-123";

async function call(method, path, body, token) {
  const res = await fetch(API + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status} ${data?.detail ?? text}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const email = (name) =>
  name.toLowerCase().replace(/^(dr|prof)\.\s+/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") +
  "@northfield.demo";

const INSTRUCTORS = ["Dr. Lena Park", "Aisha Rahman", "Carlos Mendes", "Jonas Weber", "Prof. Arun Mehta", "Mei Tanaka", "Dr. Ruth Adeyemi"];
const STUDENTS = ["Maya Okafor", "Priya Shah", "Leo Brandt", "Tomás Rivera", "Aiko Sato", "Noah Fischer"];

const CATEGORIES = [
  ["Development", "code", "sky"],
  ["Data science", "brain", "orbit"],
  ["Design", "pen-tool", "coral"],
  ["Business", "briefcase", "amber"],
  ["Mathematics", "sigma", "green"],
  ["Humanities", "feather", "ink"],
];

// [key, title, category, hue, icon, instructor, level, price, tagline, featured]
const COURSES = [
  ["ml", "Intro to Machine Learning", "Data science", "orbit", "brain", "Dr. Lena Park", "BEGINNER", 4999, "Build, train and evaluate your first models with Python.", true],
  ["python", "Python from Zero", "Development", "green", "terminal", "Aisha Rahman", "BEGINNER", 0, "Your first programs, explained one line at a time.", true],
  ["react", "Modern Web Apps with React", "Development", "sky", "code", "Carlos Mendes", "INTERMEDIATE", 5499, "Components, state and data fetching, built project by project.", true],
  ["design", "Visual Design Foundations", "Design", "coral", "pen-tool", "Jonas Weber", "BEGINNER", 0, "Layout, type and colour principles you can use tomorrow.", false],
  ["stats", "Statistics for Decision Making", "Mathematics", "sky", "sigma", "Prof. Arun Mehta", "INTERMEDIATE", 3999, "Sampling, inference and A/B tests without the jargon.", false],
  ["sql", "SQL for Analysts", "Data science", "green", "database", "Dr. Lena Park", "BEGINNER", 2999, "Query real datasets and answer business questions fast.", false],
  ["strategy", "Product Strategy", "Business", "ink", "compass", "Mei Tanaka", "INTERMEDIATE", 5999, "Turn customer insight into a roadmap people believe in.", false],
  ["writing", "Academic Writing", "Humanities", "amber", "feather", "Dr. Ruth Adeyemi", "BEGINNER", 0, "Structure arguments and cite sources with confidence.", false],
  ["dl", "Applied Deep Learning", "Data science", "coral", "cpu", "Dr. Lena Park", "ADVANCED", 7999, "CNNs, transformers and shipping models to production.", false],
  ["ux", "UX Research Methods", "Design", "orbit", "users", "Jonas Weber", "INTERMEDIATE", 3499, "Interviews, usability tests and synthesis that drives decisions.", false],
  ["finance", "Finance for Non-Finance Managers", "Business", "amber", "wallet", "Mei Tanaka", "BEGINNER", 2499, "Read a P&L, build a budget and talk numbers with confidence.", false],
  ["calc", "Calculus, Visually", "Mathematics", "green", "infinity", "Prof. Arun Mehta", "BEGINNER", 1999, "Limits, derivatives and integrals through pictures.", false],
];

const ML_CURRICULUM = [
  ["Foundations", [["What is a model?", "VIDEO", 8], ["Your first dataset", "READING", 6], ["Check your understanding", "QUIZ", 5]]],
  ["Optimization", [["Cost functions", "VIDEO", 9], ["Gradient descent", "VIDEO", 12], ["Learning rates, visually", "READING", 6]]],
  ["Regularization", [["Overfitting", "VIDEO", 11], ["Problem set 4 — Regression", "ASSIGNMENT", 45]]],
];

const curriculum = (c) =>
  c[0] === "ml"
    ? ML_CURRICULUM
    : [
        ["Getting started", [["Welcome and course map", "VIDEO", 4], ["Key ideas in " + c[2].toLowerCase(), "READING", 8], ["Quick check", "QUIZ", 5]]],
        ["Core skills", [["Fundamentals, step by step", "VIDEO", 14], ["Worked example", "VIDEO", 11], ["Practice notes", "READING", 7]]],
        ["Apply it", [["Putting it together", "VIDEO", 10], ["Final project", "ASSIGNMENT", 60]]],
      ];

const QUIZ = [
  { prompt: "What is the main goal of this module?", kind: "SINGLE", options: ["Memorise definitions", "Build intuition you can apply", "Skip to the final project"], correct: [1], explanation: "Intuition is what transfers to new problems." },
  { prompt: "When you get stuck, what should you try first?", kind: "SINGLE", options: ["Re-watch the worked example", "Abandon the course", "Guess randomly"], correct: [0] },
  { prompt: "How is the final project assessed?", kind: "SINGLE", options: ["It is not assessed", "Peer review only", "Graded by the instructor with feedback"], correct: [2] },
];

// Photos from the design (Unsplash).
const IMG = (id, w, h) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=70&auto=format&fit=crop`;
const COVERS = {
  ml: "1677442136019-21780ecad995", python: "1526379095098-d400fd0bf935", react: "1633356122544-f134324a6cee",
  design: "1561070791-2526d30994b5", stats: "1460925895917-afdab827c52f", sql: "1551288049-bebda4e38f71",
  strategy: "1552664730-d307ca884978", writing: "1455390582262-044cdead277a", dl: "1620712943543-bcc4688e7485",
  ux: "1586717791821-3f44a563fa4c", finance: "1554224155-6726b3ff858f", calc: "1509228468518-180dd4864904",
};
const PHOTOS = {
  "Maya Okafor": "1580489944761-15a19d654956", "Dr. Lena Park": "1573496359142-b8d87734a5a2", "Prof. Arun Mehta": "1507003211169-0a1dd7228f2d",
  "Jonas Weber": "1472099645785-5658abf4ff4e", "Dr. Ruth Adeyemi": "1494790108377-be9c29b29330", "Mei Tanaka": "1534528741775-53994a69daeb",
  "Carlos Mendes": "1500648767791-00dcc994a43e", "Aisha Rahman": "1544005313-94ddf0286df2", "Ada Lovelace": "1519085360753-af0119f7cbe7",
  "Leo Brandt": "1506794778202-cad84cf45f1d", "Priya Shah": "1438761681033-6461ffad8d80", "Aiko Sato": "1487412720507-e7ab37603c6f",
  "Tomás Rivera": "1560250097-0b93528c311a",
};

const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const days = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
const hoursFromNow = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

async function main() {
  console.log(`Seeding ${ORG} at ${API} …`);
  let admin;
  try {
    admin = await call("POST", "/auth/register-organization", {
      orgName: "Northfield University",
      orgSlug: ORG,
      fullName: "Ada Lovelace",
      email: "ada@northfield.demo",
      password: DEMO_PASSWORD,
    });
  } catch (e) {
    if (e.status === 409) {
      console.log(`Organization "${ORG}" already exists — nothing to do. Drop and recreate the database to reseed.`);
      return;
    }
    throw e;
  }
  const A = admin.accessToken;

  // Categories
  const categoryIds = {};
  for (const [name, icon, hue] of CATEGORIES) {
    categoryIds[name] = (await call("POST", "/admin/categories", { name, icon, hue }, A)).id;
  }

  // People: invite everyone, then accept each invite.
  const people = {};
  async function invite(names, role) {
    const created = await call("POST", "/admin/invites", { emails: names.map(email), role }, A);
    for (const inv of created) {
      const name = names.find((n) => email(n) === inv.email);
      const token = inv.link.split("/").pop();
      const auth = await call("POST", "/auth/invites/accept", { token, fullName: name, password: DEMO_PASSWORD });
      people[name] = auth;
    }
  }
  await invite(INSTRUCTORS, "INSTRUCTOR");
  await invite(STUDENTS, "STUDENT");
  await call("PATCH", "/me", { avatarUrl: IMG(PHOTOS["Ada Lovelace"], 160, 160) }, A);
  for (const [name, auth] of Object.entries(people)) {
    if (PHOTOS[name]) await call("PATCH", "/me", { avatarUrl: IMG(PHOTOS[name], 160, 160) }, auth.accessToken);
  }
  console.log(`  ${INSTRUCTORS.length} instructors, ${STUDENTS.length} students`);

  // Courses
  const courses = {};
  for (const c of COURSES) {
    const [key, title, category, hue, icon, instructor, level, priceCents, tagline, featured] = c;
    const T = people[instructor].accessToken;
    const editor = await call(
      "POST",
      "/instructor/courses",
      {
        title,
        tagline,
        categoryId: categoryIds[category],
        level,
        priceCents,
        hue,
        icon,
        coverUrl: IMG(COVERS[key], 1280, 720),
        description:
          `${tagline}\n\nThis course is taught by ${instructor}. Each module mixes short videos, readings and practice so you ` +
          `build real skill, not just familiarity. You'll finish with a project you can show.`,
        outcomes: ["Explain the core ideas in plain language", "Apply them to a realistic problem", "Know what to learn next"],
      },
      T,
    );
    const lessons = [];
    for (const [sectionTitle, items] of curriculum(c)) {
      const section = await call("POST", `/instructor/courses/${editor.course.id}/sections`, { title: sectionTitle }, T);
      for (const [i, [lessonTitle, kind, minutes]] of items.entries()) {
        const lesson = await call(
          "POST",
          `/instructor/sections/${section.id}/lessons`,
          {
            title: lessonTitle,
            kind,
            durationMinutes: minutes,
            preview: lessons.length === 0 && i === 0,
            content:
              kind === "READING"
                ? `## ${lessonTitle}\n\nRead this before the next video. Focus on the intuition: why does this idea work, and when does it break?\n\n- Start from a concrete example\n- Name the moving parts\n- Predict what changes when you tweak one of them`
                : kind === "VIDEO"
                  ? `In this video: ${lessonTitle.toLowerCase()}. Take notes on anything that surprises you.`
                  : null,
          },
          T,
        );
        lessons.push(lesson);
        if (kind === "VIDEO") await call("PUT", `/instructor/lessons/${lesson.id}/video`, { url: SAMPLE_VIDEO, durationSeconds: minutes * 60 }, T);
        if (kind === "QUIZ") await call("PUT", `/instructor/lessons/${lesson.id}/quiz`, { passPercent: 100, questions: QUIZ, dueAt: key === "stats" ? days(8) : null }, T);
        if (kind === "ASSIGNMENT")
          await call(
            "PUT",
            `/instructor/lessons/${lesson.id}/assignment`,
            {
              instructions:
                "Apply what you learned in this course to a small dataset or brief of your choice. Submit a notebook, PDF or link with a short write-up of your approach.",
              dueAt: key === "ml" ? hoursFromNow(30) : days(14),
              maxPoints: 100,
            },
            T,
          );
      }
    }
    await call("POST", `/instructor/courses/${editor.course.id}/publish`, undefined, T);
    if (featured) await call("PATCH", `/instructor/courses/${editor.course.id}`, { featured: true }, A);
    courses[key] = { id: editor.course.id, instructor, lessons };
  }
  console.log(`  ${COURSES.length} courses published`);

  // Enrollments and progress (from the design's seed: Maya is halfway through ML, etc.)
  const enroll = async (student, key) => {
    const c = courses[key];
    const T = people[instructorOf(key)].accessToken;
    await call("POST", `/instructor/courses/${c.id}/learners`, { userIds: [people[student].user.id] }, T);
  };
  const instructorOf = (key) => courses[key].instructor;
  const complete = async (student, key, fraction) => {
    const S = people[student].accessToken;
    const lessons = courses[key].lessons;
    const n = Math.round(lessons.length * fraction);
    for (const lesson of lessons.slice(0, n)) {
      await call("GET", `/me/lessons/${lesson.id}`, undefined, S);
      if (lesson.kind === "VIDEO" || lesson.kind === "READING") await call("POST", `/me/lessons/${lesson.id}/complete`, undefined, S);
      if (lesson.kind === "QUIZ") {
        const quiz = await call("GET", `/me/lessons/${lesson.id}/quiz`, undefined, S);
        const answers = Object.fromEntries(quiz.questions.map((q, i) => [q.id, QUIZ[i].correct]));
        await call("POST", `/me/lessons/${lesson.id}/quiz/attempts`, { answers }, S);
      }
      if (lesson.kind === "ASSIGNMENT")
        await call("POST", `/me/lessons/${lesson.id}/assignment/submission`, { body: "My approach and results.", linkUrl: "https://colab.example.com/notebook" }, S);
    }
  };

  const plan = [
    ["Maya Okafor", "ml", 0.5],
    ["Maya Okafor", "stats", 0.375],
    ["Maya Okafor", "design", 0.88],
    ["Maya Okafor", "writing", 1],
    ["Priya Shah", "ml", 1],
    ["Leo Brandt", "ml", 1],
    ["Tomás Rivera", "ml", 0.25],
    ["Aiko Sato", "ml", 0.75],
    ["Noah Fischer", "ml", 0],
    ["Priya Shah", "python", 0.6],
    ["Leo Brandt", "sql", 0.4],
    ["Aiko Sato", "react", 0.3],
  ];
  for (const [student, key, fraction] of plan) {
    await enroll(student, key);
    await complete(student, key, fraction);
  }
  for (const key of ["react", "ux"]) await call("PUT", `/me/wishlist/${courses[key].id}`, undefined, people["Maya Okafor"].accessToken);
  console.log(`  ${plan.length} enrollments with progress`);

  // Reviews
  const reviews = [
    ["Maya Okafor", "writing", 5, "Clear, practical and kind. My essays are better already."],
    ["Priya Shah", "ml", 5, "The gradient descent visuals finally made it click."],
    ["Leo Brandt", "ml", 4, "Great pacing. The problem set is a real stretch in a good way."],
    ["Aiko Sato", "ml", 5, "Dr. Park explains things so well."],
    ["Priya Shah", "python", 5, "Perfect first course."],
  ];
  for (const [student, key, rating, comment] of reviews) {
    await call("PUT", `/me/courses/${courses[key].id}/review`, { rating, comment }, people[student].accessToken);
  }

  // Grade one ML submission, leave the rest in the queue.
  const lena = people["Dr. Lena Park"].accessToken;
  const queue = await call("GET", `/instructor/grading-queue?courseId=${courses.ml.id}`, undefined, lena);
  if (queue[0]) await call("PUT", `/instructor/submissions/${queue[0].id}/grade`, { points: 94, feedback: "Excellent analysis — clear and well argued." }, lena);

  // Live sessions for "Today"
  const today = new Date();
  const at = (h, m) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).toISOString();
  const sessions = [
    ["ml", "Dr. Lena Park", "Live: Neural nets Q&A", "LIVE_CLASS", at(9, 0), 60],
    ["stats", "Prof. Arun Mehta", "Study group", "STUDY_GROUP", at(13, 30), 60],
    ["design", "Jonas Weber", "Critique session", "WORKSHOP", at(16, 0), 45],
  ];
  for (const [key, instructor, title, kind, startsAt, minutes] of sessions) {
    await call(
      "POST",
      `/instructor/courses/${courses[key].id}/sessions`,
      { title, kind, startsAt, endsAt: new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString(), meetingUrl: "https://meet.example.com/orbitly" },
      people[instructor].accessToken,
    );
  }

  // A discussion thread
  const thread = await call(
    "POST",
    `/me/courses/${courses.ml.id}/threads`,
    { body: "Why does a learning rate that's too high make the loss bounce around instead of settling?", lessonId: courses.ml.lessons[4].id },
    people["Leo Brandt"].accessToken,
  );
  await call("POST", `/me/threads/${thread.thread.id}/replies`, { body: "Each step overshoots the minimum, so you land on the other side of the valley — and it keeps happening. Try halving it." }, lena);

  console.log(`Done. Sign in at ${process.env.APP_URL ?? "http://localhost:3000"}/login`);
  console.log(`  admin       ada@northfield.demo`);
  console.log(`  instructor  ${email("Dr. Lena Park")}`);
  console.log(`  student     ${email("Maya Okafor")}`);
  console.log(`  password    (see DEMO_PASSWORD in scripts/seed-demo.mjs)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
