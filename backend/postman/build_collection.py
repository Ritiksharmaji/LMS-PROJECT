"""Builds Orbitly-API.postman_collection.json and Orbitly-Local.postman_environment.json.

Usage: python3 build_collection.py <output-dir>   (e.g. `python3 build_collection.py .` from backend/postman)
Edit the folders below, rebuild, and commit the regenerated JSON.
"""
import json, sys, uuid

OUT = sys.argv[1]

# ---------- helpers ----------
def script(lines):
    return [l for l in lines.strip("\n").split("\n")]

def req(name, method, path, who=None, body=None, tests="", pre="", desc="", raw=None, headers=None, expect=None):
    """who: admin | instructor | student | None (public). expect: allowed status codes (default 2xx)."""
    url = "{{baseUrl}}" + path
    host_path = path.split("?")[0].strip("/").split("/")
    query = []
    if "?" in path:
        for kv in path.split("?", 1)[1].split("&"):
            k, _, v = kv.partition("=")
            query.append({"key": k, "value": v})
    r = {
        "method": method,
        "header": [],
        "url": {"raw": url, "host": ["{{baseUrl}}"], "path": host_path, **({"query": query} if query else {})},
        "description": desc,
    }
    if who:
        r["auth"] = {"type": "bearer", "bearer": [{"key": "token", "value": "{{" + who + "Token}}", "type": "string"}]}
    else:
        r["auth"] = {"type": "noauth"}
    if body is not None:
        r["header"].append({"key": "Content-Type", "value": "application/json"})
        r["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2), "options": {"raw": {"language": "json"}}}
    if raw is not None:
        r["body"] = {"mode": "raw", "raw": raw}
    for h in headers or []:
        r["header"].append(h)
    codes = expect or [200, 201, 202, 204]
    test = f"pm.test(\"{name}: status {'/'.join(map(str, codes))}\", () => pm.expect(pm.response.code).to.be.oneOf({codes}));\n"
    events = [{"listen": "test", "script": {"type": "text/javascript", "exec": script(test + tests)}}]
    if pre:
        events.insert(0, {"listen": "prerequest", "script": {"type": "text/javascript", "exec": script(pre)}})
    return {"name": name, "event": events, "request": r}

def save(var, expr):
    return f"pm.collectionVariables.set(\"{var}\", {expr});\n"

J = "const j = pm.response.json();\n"

def folder(name, desc, items):
    return {"name": name, "description": desc, "item": items}

# ---------- dummy data ----------
folders = []

folders.append(folder("00 · Setup", "Creates a fresh organization for this run, so the collection never touches real data. Run the folders in order (Collection Runner) — later requests use ids saved by earlier ones.", [
    req("Health check", "GET", "/actuator/health", desc="Liveness of the API, database and migrations."),
    req("Register organization (admin)", "POST", "/api/auth/register-organization", body={
        "orgName": "Postman Academy {{runId}}", "orgSlug": "{{orgSlug}}", "fullName": "Priya Admin",
        "email": "admin.{{runId}}@postman.test", "password": "{{password}}"},
        pre=save("runId", "String(Date.now()).slice(-8)") + "pm.collectionVariables.set(\"orgSlug\", \"postman-\" + pm.collectionVariables.get(\"runId\"));\n",
        tests=J + save("adminToken", "j.accessToken") + save("adminRefresh", "j.refreshToken") + save("orgId", "j.organization.id") + save("adminUserId", "j.user.id")
        + "pm.test(\"role is ADMIN\", () => pm.expect(j.role).to.eql(\"ADMIN\"));\n",
        desc="Creates the organization and its first ADMIN. Saves `adminToken`, `orgSlug`, `orgId`."),
    req("Public organization", "GET", "/api/public/organizations/{{orgSlug}}"),
    req("Allow self-signup", "PATCH", "/api/admin/organization", "admin", {"selfSignup": True, "clearSeatLimit": True},
        tests=J + "pm.test(\"self-signup on\", () => pm.expect(j.selfSignup).to.eql(true));\n"),
]))

folders.append(folder("01 · Auth & account", "Login, token refresh, profile and password flows.", [
    req("Login (admin)", "POST", "/api/auth/login", body={"orgSlug": "{{orgSlug}}", "email": "admin.{{runId}}@postman.test", "password": "{{password}}"},
        tests=J + save("adminToken", "j.accessToken") + save("adminRefresh", "j.refreshToken")),
    req("Refresh token", "POST", "/api/auth/refresh", body={"refreshToken": "{{adminRefresh}}"},
        tests=J + save("adminToken", "j.accessToken") + save("adminRefresh", "j.refreshToken"),
        desc="Refresh tokens are single-use: replaying an old one revokes every session."),
    req("Me", "GET", "/api/me", "admin"),
    req("Update profile", "PATCH", "/api/me", "admin", {"fullName": "Priya Sharma"}),
    req("My organizations", "GET", "/api/me/organizations", "admin"),
    req("Forgot password", "POST", "/api/auth/password/forgot", body={"email": "admin.{{runId}}@postman.test"},
        desc="Always 202. With MAIL_MODE=log the reset link is printed in the API log."),
]))

folders.append(folder("02 · People & invites (admin)", "Invite an instructor, accept the invite, and let a student sign up.", [
    req("Invite instructor", "POST", "/api/admin/invites", "admin", {"emails": ["instructor.{{runId}}@postman.test"], "role": "INSTRUCTOR"},
        tests=J + "const link = (Array.isArray(j) ? j : j.items || j.invites)[0].link;\n" + save("inviteToken", "link.split(/[\\/=]/).pop()")),
    req("List pending invites", "GET", "/api/admin/invites", "admin"),
    req("Invite preview", "GET", "/api/auth/invites/{{inviteToken}}",
        tests=J + "pm.test(\"invite is for an instructor\", () => pm.expect(j.role).to.eql(\"INSTRUCTOR\"));\n"),
    req("Accept invite (instructor)", "POST", "/api/auth/invites/accept", body={"token": "{{inviteToken}}", "fullName": "Dr. Lena Park", "password": "{{password}}"},
        tests=J + save("instructorToken", "j.accessToken") + save("instructorUserId", "j.user.id")),
    req("Student self-signup", "POST", "/api/auth/signup", body={"orgSlug": "{{orgSlug}}", "fullName": "Sam Learner", "email": "student.{{runId}}@postman.test", "password": "{{password}}"},
        tests=J + save("studentToken", "j.accessToken") + save("studentUserId", "j.user.id")),
    req("Search members", "GET", "/api/admin/members?q=&page=0&size=20", "admin",
        tests=J + "pm.test(\"three members\", () => pm.expect(j.total).to.eql(3));\n"
        + save("studentMemberId", "j.items.find(m => m.role === 'STUDENT').id")),
    req("Member counts", "GET", "/api/admin/members/counts", "admin"),
    req("Organization settings", "GET", "/api/admin/organization", "admin"),
]))

future = "const d = new Date(Date.now() + 7 * 864e5); pm.collectionVariables.set(\"dueAt\", d.toISOString());\n"
folders.append(folder("03 · Catalog & authoring", "An admin creates a category; the instructor builds and publishes a free course (video, reading, quiz, assignment) and a paid one.", [
    req("Create category", "POST", "/api/admin/categories", "admin", {"name": "Data science", "icon": "brain", "hue": "orbit", "position": 1},
        tests=J + save("categoryId", "j.id")),
    req("Create course (free)", "POST", "/api/instructor/courses", "instructor", {
        "title": "Intro to Machine Learning", "tagline": "Build, train and evaluate your first models with Python.",
        "description": "Start from zero and finish with a working model.\n\nNo prior ML experience needed.",
        "categoryId": "{{categoryId}}", "level": "BEGINNER", "priceCents": 0, "currency": "USD", "hue": "orbit", "icon": "brain",
        "outcomes": ["Explain supervised learning", "Train a regression model", "Evaluate a model honestly"]},
        tests=J + save("courseId", "j.course.id") + save("courseSlug", "j.course.slug")),
    req("Add section", "POST", "/api/instructor/courses/{{courseId}}/sections", "instructor", {"title": "Foundations"},
        tests=J + save("sectionId", "j.id")),
    req("Add lesson · video", "POST", "/api/instructor/sections/{{sectionId}}/lessons", "instructor", {"title": "What is a model?", "kind": "VIDEO", "durationMinutes": 8, "preview": True},
        tests=J + save("videoLessonId", "j.id")),
    req("Set lesson video URL", "PUT", "/api/instructor/lessons/{{videoLessonId}}/video", "instructor", {"url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", "durationSeconds": 480}),
    req("Add lesson · reading", "POST", "/api/instructor/sections/{{sectionId}}/lessons", "instructor", {"title": "Your first dataset", "kind": "READING", "durationMinutes": 6,
        "content": "## Datasets\n\nA dataset is a table of examples. Each row is one example; each column is a feature."},
        tests=J + save("readingLessonId", "j.id")),
    req("Add lesson · quiz", "POST", "/api/instructor/sections/{{sectionId}}/lessons", "instructor", {"title": "Quick check", "kind": "QUIZ"},
        tests=J + save("quizLessonId", "j.id")),
    req("Save quiz questions", "PUT", "/api/instructor/lessons/{{quizLessonId}}/quiz", "instructor", {
        "passPercent": 70, "maxAttempts": 3, "dueAt": "{{dueAt}}", "questions": [
            {"prompt": "Which of these is supervised learning?", "kind": "SINGLE", "options": ["Clustering customers", "Predicting house prices from labelled sales", "Compressing images"], "correct": [1], "explanation": "Labelled examples make it supervised.", "points": 1},
            {"prompt": "Select every evaluation metric.", "kind": "MULTIPLE", "options": ["Accuracy", "Learning rate", "F1 score"], "correct": [0, 2], "explanation": "Learning rate is a training setting.", "points": 1}]},
        pre=future),
    req("Add lesson · assignment", "POST", "/api/instructor/sections/{{sectionId}}/lessons", "instructor", {"title": "Mini project", "kind": "ASSIGNMENT"},
        tests=J + save("assignmentLessonId", "j.id")),
    req("Save assignment", "PUT", "/api/instructor/lessons/{{assignmentLessonId}}/assignment", "instructor", {
        "instructions": "Train a linear regression on the sample dataset and share your notebook.", "dueAt": "{{dueAt}}", "maxPoints": 100, "allowLate": True},
        pre=future),
    req("Course editor", "GET", "/api/instructor/courses/{{courseId}}", "instructor",
        tests=J + "pm.test(\"four lessons\", () => pm.expect(j.sections[0].lessons.length).to.eql(4));\n"),
    req("Publish course", "POST", "/api/instructor/courses/{{courseId}}/publish", "instructor"),
    req("Create course (paid)", "POST", "/api/instructor/courses", "instructor", {
        "title": "SQL for Analysts", "tagline": "Answer real business questions with SQL.", "categoryId": "{{categoryId}}",
        "level": "INTERMEDIATE", "priceCents": 4999, "currency": "USD", "hue": "sky", "icon": "database", "outcomes": ["Write joins with confidence"]},
        tests=J + save("paidCourseId", "j.course.id")),
    req("Paid course · section", "POST", "/api/instructor/courses/{{paidCourseId}}/sections", "instructor", {"title": "Getting started"},
        tests=J + save("paidSectionId", "j.id")),
    req("Paid course · lesson", "POST", "/api/instructor/sections/{{paidSectionId}}/lessons", "instructor", {"title": "SELECT basics", "kind": "READING", "durationMinutes": 10, "content": "SELECT picks columns; WHERE filters rows."}),
    req("Publish paid course", "POST", "/api/instructor/courses/{{paidCourseId}}/publish", "instructor"),
    req("My courses (instructor)", "GET", "/api/instructor/courses", "instructor"),
]))

folders.append(folder("04 · Public catalog", "What anyone can see without signing in.", [
    req("Categories", "GET", "/api/public/organizations/{{orgSlug}}/categories"),
    req("Search courses", "GET", "/api/public/organizations/{{orgSlug}}/courses?sort=POPULAR&page=0&size=12",
        tests=J + "pm.test(\"two published courses\", () => pm.expect(j.total).to.eql(2));\n"),
    req("Search · free only", "GET", "/api/public/organizations/{{orgSlug}}/courses?price=free&q=machine"),
    req("Course page", "GET", "/api/public/organizations/{{orgSlug}}/courses/{{courseSlug}}"),
]))

answers = ("const q = pm.collectionVariables.get(\"quizQuestions\");\n"
           "const ids = JSON.parse(q);\n"
           "pm.collectionVariables.set(\"quizAnswers\", JSON.stringify({ [ids[0]]: [1], [ids[1]]: [0, 2] }));\n")
folders.append(folder("05 · Learning (student)", "Enroll, open the player, complete lessons, pass the quiz, submit the assignment and review the course.", [
    req("Wishlist · save", "PUT", "/api/me/wishlist/{{paidCourseId}}", "student"),
    req("Wishlist", "GET", "/api/me/wishlist", "student"),
    req("Enroll (free course)", "POST", "/api/me/enrollments", "student", {"courseId": "{{courseId}}"}),
    req("Enroll (paid course) → 402", "POST", "/api/me/enrollments", "student", {"courseId": "{{paidCourseId}}"}, expect=[402],
        desc="Paid courses must go through checkout (folder 09)."),
    req("My enrollments", "GET", "/api/me/enrollments", "student"),
    req("Player", "GET", "/api/me/courses/{{courseId}}/player", "student"),
    req("Open lesson", "GET", "/api/me/lessons/{{readingLessonId}}", "student"),
    req("Lesson video", "GET", "/api/me/lessons/{{videoLessonId}}/video", "student"),
    req("Save video position", "PUT", "/api/me/lessons/{{videoLessonId}}/position", "student", {"seconds": 95}),
    req("Complete video lesson", "POST", "/api/me/lessons/{{videoLessonId}}/complete", "student"),
    req("Complete reading lesson", "POST", "/api/me/lessons/{{readingLessonId}}/complete", "student"),
    req("Quiz", "GET", "/api/me/lessons/{{quizLessonId}}/quiz", "student",
        tests=J + save("quizQuestions", "JSON.stringify(j.questions.map(q => q.id))")),
    req("Submit quiz attempt", "POST", "/api/me/lessons/{{quizLessonId}}/quiz/attempts", "student", raw="{\n  \"answers\": {{quizAnswers}}\n}",
        headers=[{"key": "Content-Type", "value": "application/json"}], pre=answers,
        tests=J + "pm.test(\"quiz passed\", () => pm.expect(j.attempt.passed).to.eql(true));\n"),
    req("Assignment", "GET", "/api/me/lessons/{{assignmentLessonId}}/assignment", "student"),
    req("Submit assignment", "POST", "/api/me/lessons/{{assignmentLessonId}}/assignment/submission", "student", {
        "body": "Notebook trains a linear regression; RMSE 3.2 on the holdout set.", "linkUrl": "https://colab.research.google.com/drive/example"}),
    req("Deadlines", "GET", "/api/me/deadlines", "student"),
    req("Learning summary", "GET", "/api/me/learning/summary", "student"),
    req("Write review", "PUT", "/api/me/courses/{{courseId}}/review", "student", {"rating": 5, "comment": "Clear, practical and well paced."}),
    req("Public reviews", "GET", "/api/public/organizations/{{orgSlug}}/courses/{{courseId}}/reviews"),
    req("Review summary", "GET", "/api/public/organizations/{{orgSlug}}/courses/{{courseId}}/reviews/summary"),
]))

folders.append(folder("06 · Grading (instructor)", "Grade the submission; the course completes and a certificate is issued.", [
    req("Grading queue", "GET", "/api/instructor/grading-queue", "instructor",
        tests=J + "const items = Array.isArray(j) ? j : j.items;\n" + save("submissionId", "items[0].id")),
    req("Submission", "GET", "/api/instructor/submissions/{{submissionId}}", "instructor"),
    req("Grade submission", "PUT", "/api/instructor/submissions/{{submissionId}}/grade", "instructor", {"points": 92, "feedback": "Great work — try cross-validation next."}),
    req("Gradebook", "GET", "/api/instructor/courses/{{courseId}}/gradebook", "instructor"),
    req("Course roster", "GET", "/api/instructor/courses/{{courseId}}/learners", "instructor"),
    req("My grades (student)", "GET", "/api/me/grades", "student"),
    req("Enrollment completed (student)", "GET", "/api/me/enrollments?status=COMPLETED", "student",
        tests=J + "const e = (Array.isArray(j) ? j : j.items)[0];\npm.test(\"certificate issued\", () => pm.expect(e.certificateCode).to.be.a(\"string\"));\n"
        + save("certificateCode", "e.certificateCode")),
    req("Verify certificate (public)", "GET", "/api/public/certificates/{{certificateCode}}"),
]))

session_times = ("const s = new Date(Date.now() + 2 * 864e5); s.setUTCMinutes(0, 0, 0);\n"
                 "pm.collectionVariables.set(\"startsAt\", s.toISOString());\n"
                 "pm.collectionVariables.set(\"endsAt\", new Date(s.getTime() + 36e5).toISOString());\n")
folders.append(folder("07 · Schedule", "Live sessions for a course.", [
    req("Schedule live class", "POST", "/api/instructor/courses/{{courseId}}/sessions", "instructor", {
        "title": "Office hours: your first model", "description": "Bring your questions.", "kind": "OFFICE_HOURS",
        "startsAt": "{{startsAt}}", "endsAt": "{{endsAt}}", "meetingUrl": "https://meet.example.com/orbitly-ml"},
        pre=session_times, tests=J + save("sessionId", "j.id")),
    req("My schedule (student)", "GET", "/api/me/schedule", "student"),
    req("Course sessions", "GET", "/api/me/courses/{{courseId}}/sessions", "student"),
    req("Reschedule", "PATCH", "/api/instructor/sessions/{{sessionId}}", "instructor", {"title": "Office hours (moved)", "kind": "OFFICE_HOURS", "startsAt": "{{startsAt}}", "endsAt": "{{endsAt}}", "location": "Room 204"}),
    req("Sessions I manage", "GET", "/api/instructor/sessions", "instructor"),
    req("Cancel session", "POST", "/api/instructor/sessions/{{sessionId}}/cancel", "instructor"),
]))

folders.append(folder("08 · Discussion", "A student asks, the instructor answers, the student accepts the answer.", [
    req("Ask a question (student)", "POST", "/api/me/courses/{{courseId}}/threads", "student", {
        "title": "Why scale features?", "body": "My model improved after scaling — why does that help?", "lessonId": "{{readingLessonId}}"},
        tests=J + save("threadId", "j.thread.id")),
    req("Threads", "GET", "/api/me/courses/{{courseId}}/threads", "student"),
    req("Reply (instructor)", "POST", "/api/me/threads/{{threadId}}/replies", "instructor", {"body": "Gradient descent converges faster when features share a scale."},
        tests=J + save("replyId", "j.id")),
    req("Mark as answer (student)", "PUT", "/api/me/replies/{{replyId}}/answer", "student"),
    req("Pin thread (instructor)", "PUT", "/api/me/threads/{{threadId}}/pinned", "instructor"),
    req("Thread with replies", "GET", "/api/me/threads/{{threadId}}", "student",
        tests=J + "pm.test(\"resolved\", () => pm.expect(j.thread.resolved).to.eql(true));\n"),
]))

folders.append(folder("09 · Billing (test provider)", "Buy the paid course with the test provider (no real money), then refund it.", [
    req("Start checkout", "POST", "/api/me/checkout", "student", {"courseId": "{{paidCourseId}}"},
        tests=J + save("orderId", "j.orderId")),
    req("Order", "GET", "/api/me/orders/{{orderId}}", "student"),
    req("Complete test payment", "POST", "/api/me/orders/{{orderId}}/test-pay", "student",
        desc="Only with BILLING_PROVIDER=test (the default)."),
    req("My orders", "GET", "/api/me/orders", "student"),
    req("Refund", "POST", "/api/me/orders/{{orderId}}/refund", "student"),
    req("All orders (admin)", "GET", "/api/admin/orders", "admin"),
    req("Revenue (admin)", "GET", "/api/admin/revenue?days=30", "admin"),
]))


def upload_bytes():
    r = req("Upload bytes", "PUT", "/upload", None, raw="dummy avatar bytes from Postman",
            headers=[{"key": "Content-Type", "value": "image/png"}],
            desc="PUTs the bytes to the signed `uploadUrl` returned by *Create upload* (local disk in development, S3/R2 in production). In Postman you can switch the body to *binary* and pick a real image.")
    r["request"]["url"] = {"raw": "{{uploadUrl}}", "host": ["{{uploadUrl}}"]}
    return r

PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
folders.append(folder("10 · Media & resources", "Signed upload flow (create → PUT bytes → complete) and course resources.", [
    req("Create upload (avatar)", "POST", "/api/me/uploads", "student", {"purpose": "AVATAR", "fileName": "avatar.png", "contentType": "image/png", "sizeBytes": 68},
        tests=J + save("fileId", "j.fileId") + save("uploadUrl", "j.uploadUrl")),
    upload_bytes(),
    req("Complete upload", "POST", "/api/me/uploads/{{fileId}}/complete", "student",
        tests=J + save("avatarUrl", "j.publicUrl || ''")),
    req("Add link resource", "POST", "/api/instructor/courses/{{courseId}}/resources", "instructor", {"title": "scikit-learn docs", "url": "https://scikit-learn.org/stable/", "lessonId": "{{readingLessonId}}"}),
    req("Course resources", "GET", "/api/me/courses/{{courseId}}/resources", "student"),
]))

folders.append(folder("11 · Notifications", "In-app notifications produced by the steps above (grading, replies, sessions, orders).", [
    req("Notifications", "GET", "/api/me/notifications", "student",
        pre="setTimeout(() => {}, 800); // notifications are delivered just after the triggering request commits\n"),
    req("Unread count", "GET", "/api/me/notifications/unread-count", "student"),
    req("Mark all read", "POST", "/api/me/notifications/read-all", "student"),
    req("Notification settings", "GET", "/api/me/notification-settings", "student"),
    req("Turn off optional emails", "PUT", "/api/me/notification-settings", "student", {"emailEnabled": False}),
]))

folders.append(folder("12 · Analytics", "Dashboards for admins and instructors.", [
    req("Admin overview", "GET", "/api/admin/analytics/overview?range=DAYS_30", "admin"),
    req("Admin report (CSV)", "GET", "/api/admin/analytics/report.csv", "admin"),
    req("Instructor overview", "GET", "/api/instructor/analytics/overview", "instructor"),
    req("Course activity", "GET", "/api/instructor/courses/{{courseId}}/activity?range=WEEK", "instructor"),
]))

folders.append(folder("13 · Sign out", "", [
    req("Logout", "POST", "/api/auth/logout", body={"refreshToken": "{{adminRefresh}}"}),
]))

variables = ["runId", "orgSlug", "orgId", "adminToken", "adminRefresh", "adminUserId", "instructorToken", "instructorUserId",
             "studentToken", "studentUserId", "studentMemberId", "inviteToken", "categoryId", "courseId", "courseSlug", "sectionId",
             "videoLessonId", "readingLessonId", "quizLessonId", "assignmentLessonId", "quizQuestions", "quizAnswers", "dueAt",
             "paidCourseId", "paidSectionId", "submissionId", "certificateCode", "startsAt", "endsAt", "sessionId", "threadId",
             "replyId", "orderId", "fileId", "uploadUrl", "avatarUrl"]

collection = {
    "info": {
        "_postman_id": str(uuid.uuid5(uuid.NAMESPACE_URL, "orbitly-api")),
        "name": "Orbitly LMS API",
        "description": (
            "Every Orbitly API area with dummy data.\n\n"
            "**Run it:** import this collection and `Orbitly-Local.postman_environment.json`, start the API, then run the whole "
            "collection with the Collection Runner (or `npx newman run`). Folder 00 registers a brand-new organization each run, "
            "so nothing touches your real data. Ids and tokens are saved as collection variables as the run goes.\n\n"
            "**Roles:** requests authenticate as `admin`, `instructor` or `student` using `{{adminToken}}`, `{{instructorToken}}` "
            "and `{{studentToken}}`.\n\nFull reference: `backend/docs/API.md` and Swagger UI at `/api/docs/ui`."),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "item": folders,
    "variable": [{"key": k, "value": ""} for k in variables],
}

env = {
    "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "orbitly-env-local")),
    "name": "Orbitly · Local",
    "values": [
        {"key": "baseUrl", "value": "http://localhost:8080", "type": "default", "enabled": True},
        {"key": "password", "value": "Postman-Pass-2026", "type": "secret", "enabled": True},
    ],
    "_postman_variable_scope": "environment",
}

json.dump(collection, open(f"{OUT}/Orbitly-API.postman_collection.json", "w"), indent=2)
json.dump(env, open(f"{OUT}/Orbitly-Local.postman_environment.json", "w"), indent=2)
print(sum(len(f["item"]) for f in folders), "requests in", len(folders), "folders")
