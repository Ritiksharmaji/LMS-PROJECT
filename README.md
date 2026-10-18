# Orbitly LMS

A multi-tenant learning management system with three roles — **Student**, **Instructor** and **Admin** — built from
the Orbitly Portal design.

| Part | Stack |
|---|---|
| [`backend/`](backend/README.md) | Spring Boot 4 · Java 17 · PostgreSQL · Flyway · Spring Security (JWT) |
| [`frontend/`](frontend/README.md) | Next.js 16 · TypeScript · Tailwind CSS v4 · TanStack Query · Orbitly design system |

## What it does

- **Public site** — landing page, searchable catalog, SEO-ready course pages, checkout, verifiable certificates
- **Students** — dashboard, course player (video, readings, quizzes, assignments), discussions, schedule, grades,
  wishlist, orders and refunds, notifications
- **Instructors** — teaching overview, course builder (curriculum, quiz builder, assignments, resources, video),
  grading queue and gradebook, live sessions, learner rosters
- **Admins** — platform analytics and reports, people and invites, seats, catalog, orders, organization settings

## Run it

### With Docker (everything)

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
docker compose run --rm seed     # optional demo data
```

Open http://localhost:3000. API docs: http://localhost:8080/api/docs/ui.

### Locally

```bash
createdb orbitly && createdb orbitly_test
cd backend && ./gradlew bootRun                       # API on :8080
cd frontend && npm install && npm run dev             # web on :3000
API_URL=http://localhost:8080 node frontend/scripts/seed-demo.mjs
```

Demo accounts are listed in [`frontend/scripts/seed-demo.mjs`](frontend/scripts/seed-demo.mjs).

### Checks

```bash
cd backend && ./gradlew test                          # 85 API integration tests
cd frontend && npm run lint && npx tsc --noEmit
WEB_URL=http://localhost:3000 node frontend/scripts/smoke.mjs   # every page, every role
```

## Configuration

Defaults need only Postgres: local file storage, emails printed to the API log and a test payment provider.
For production set, at minimum: `JWT_SECRET`, `APP_URL`, `MAIL_MODE=smtp` + SMTP settings, `BILLING_PROVIDER=stripe`
+ Stripe keys, `MEDIA_STORAGE=s3` + bucket settings, and optionally Mux for video. See
[`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).

## Branches

| Branch | Contents |
|---|---|
| `main` | Initial commit |
| `development` | Integration branch (includes the finished backend) |
| `backend` ← `backend-01-setup` … `backend-11-analytics` | API, one branch per module |
| `frontend` ← `frontend-01-setup` … `frontend-07-admin` | Web app, one branch per module |
| `frontend-08-complete` | The full app in one branch: error pages, Docker, smoke test, this README (not merged) |
