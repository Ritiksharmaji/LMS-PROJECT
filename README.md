# Orbitly LMS

A multi-tenant learning management system with three roles — **Student**, **Instructor** and **Admin** — built from
the Orbitly Portal design.

| Part | Stack |
|---|---|
| [`backend/`](backend/README.md) | Spring Boot 4 · Java 17 · PostgreSQL · Flyway · Spring Security (JWT) |
| [`frontend/`](frontend/README.md) | Next.js 16 · TypeScript · Tailwind CSS v4 · TanStack Query · Phosphor icons · Orbitly design system (light + dark) |
| [`mobile/`](mobile/README.md) | React Native 0.87 CLI (iOS + Android) · TypeScript · React Navigation · TanStack Query · Keychain |

## What it does

- **Public site** — landing page, searchable catalog, SEO-ready course pages, checkout, verifiable certificates
- **Students** — dashboard, course player (video, readings, quizzes, assignments), discussions, schedule, grades,
  wishlist, orders and refunds, notifications
- **Instructors** — teaching overview, course builder (curriculum, quiz builder, assignments, resources, video),
  grading queue and gradebook, live sessions, learner rosters
- **Admins** — platform analytics and reports, people and invites, seats, catalog, orders, organization settings
- **Mobile app** — the same three areas on iOS and Android (course building stays on the web)

How it all fits together, flow by flow: [`application-flow.md`](application-flow.md).

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

### Mobile

See [`mobile/README.md`](mobile/README.md) — `npm install`, `pod install`, then `npm run ios` / `npm run android`.

### API collection

[`backend/postman/`](backend/postman/README.md) has a Postman collection (101 requests, dummy data) that builds a fresh
organization and walks every flow: `npx newman run backend/postman/Orbitly-API.postman_collection.json -e backend/postman/Orbitly-Local.postman_environment.json`.

### Checks

```bash
cd backend && ./gradlew test                          # 85 API integration tests
cd frontend && npm run lint && npx tsc --noEmit
WEB_URL=http://localhost:3000 node frontend/scripts/smoke.mjs   # every page, every role
cd mobile && npx tsc --noEmit && npm run lint
```

## Configuration

Defaults need only Postgres: local file storage, emails printed to the API log and a test payment provider.
For production set, at minimum: `JWT_SECRET`, `APP_URL`, `MAIL_MODE=smtp` + SMTP settings, `BILLING_PROVIDER=stripe`
+ Stripe keys, `MEDIA_STORAGE=s3` + bucket settings, and optionally Mux for video. See
[`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).

## Branches

| Branch | Contents |
|---|---|
| `main` | The complete app (everything below, merged) |
| `development` | Integration branch: backend + frontend |
| `backend` ← `backend-01-setup` … `backend-12-postman` | API, one branch per module; Postman collection |
| `frontend` ← `frontend-01-setup` … `frontend-12-mobile` | Web and mobile apps, one branch per module |
| `frontend-08-complete` | Error pages, Docker, smoke test, this README |
| `frontend-09-motion` | Landing hero animation, scroll reveals and hover polish |
| `frontend-10-motion-all` | Motion on every page; fixes a hydration warning from the scroll reveals |
| `frontend-11-icons-theme` | Phosphor duotone icons (no icon animation); Light / Dark / System themes |
| `frontend-12-mobile` | React Native CLI mobile app (`mobile/`) |
