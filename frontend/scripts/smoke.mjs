#!/usr/bin/env node
/**
 * Loads every page of a running Orbitly web app as a visitor and as each demo role (after `seed-demo.mjs`) and
 * fails if any page errors.
 *
 *   WEB_URL=http://localhost:3000 node scripts/smoke.mjs
 */
const WEB = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "orbitly-demo-123"; // demo accounts from scripts/seed-demo.mjs
const ORG = process.env.ORG_SLUG ?? "northfield";

let failures = 0;

async function signIn(email) {
  const res = await fetch(`${WEB}/api/session/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgSlug: ORG, email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Sign-in failed for ${email}: ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function api(cookie, path) {
  const res = await fetch(`${WEB}/api/backend${path}`, { headers: { cookie } });
  return res.ok ? res.json() : null;
}

async function check(label, path, cookie, expect = 200) {
  const res = await fetch(WEB + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  const broken = /Application error|Internal Server Error/.test(body);
  const ok = res.status === expect && !broken;
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${String(res.status).padEnd(3)} ${label.padEnd(11)} ${path}`);
}

const visitor = ["/", "/courses", "/courses?price=free&sort=RATING", "/courses/intro-to-machine-learning", "/login", "/signup", "/register", "/forgot-password", "/robots.txt", "/sitemap.xml"];
for (const p of visitor) await check("visitor", p);
await check("visitor", "/learn", undefined, 307);
await check("visitor", "/does-not-exist", undefined, 404);

const student = await signIn("maya.okafor@northfield.demo");
const enrollments = (await api(student, "/me/enrollments")) ?? [];
const course = enrollments[0]?.course;
const certificate = enrollments.find((e) => e.certificateCode)?.certificateCode;
for (const p of ["/learn", "/learn/browse", "/learn/browse/python-from-zero", "/learn/courses", "/learn/courses?tab=completed", "/learn/wishlist", "/learn/schedule", "/learn/grades", "/learn/orders", "/learn/notifications", "/learn/settings"]) await check("student", p, student);
if (course) await check("student", `/learn/courses/${course.id}`, student);
if (certificate) await check("student", `/certificates/${certificate}`, student);
await check("student", "/admin", student, 307);

const instructor = await signIn("lena.park@northfield.demo");
const taught = (await api(instructor, "/instructor/courses")) ?? [];
for (const p of ["/teach", "/teach/courses", "/teach/grading", "/teach/grading?tab=book", "/teach/schedule"]) await check("instructor", p, instructor);
if (taught[0]) await check("instructor", `/teach/courses/${taught[0].id}?tab=curriculum`, instructor);

const admin = await signIn("ada@northfield.demo");
for (const p of ["/admin", "/admin/people", "/admin/catalog", "/admin/orders", "/admin/settings"]) await check("admin", p, admin);
const report = await fetch(`${WEB}/api/backend/admin/analytics/report.csv`, { headers: { cookie: admin } });
const csvOk = report.ok && (await report.text()).startsWith("Course,");
if (!csvOk) failures++;
console.log(`${csvOk ? "ok  " : "FAIL"} ${report.status} admin       report.csv`);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll pages load.");
process.exit(failures ? 1 : 0);
