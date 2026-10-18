# Orbitly API

Spring Boot 4 · Java 17 · PostgreSQL · Flyway · Spring Security (JWT).

## Run locally

```bash
createdb orbitly
createdb orbitly_test
./gradlew bootRun
```

- API: http://localhost:8080
- OpenAPI JSON: http://localhost:8080/api/docs
- Swagger UI: http://localhost:8080/api/docs/ui
- Health: http://localhost:8080/actuator/health

Configuration comes from environment variables — see `.env.example`. Defaults need nothing but Postgres:
local file storage, emails printed to the log, and a test payment provider. If port 8080 is taken,
run with `PORT=8090 API_URL=http://localhost:8090 ./gradlew bootRun`.

## Tests

```bash
./gradlew test
```

Integration tests run against the local `orbitly_test` database (Flyway resets it).

## Modules

| Package | What it does | Migration |
|---|---|---|
| `common` | Security (JWT), errors, paging, tenant base entities, webhook signatures | — |
| `identity` | Organizations, accounts, roles, invites, seats, password reset | V1 |
| `catalog` | Categories, courses, sections, lessons, wishlist | V2 |
| `learning` | Enrollments, course player, progress, certificates, reviews | V3 |
| `assessment` | Quizzes, assignments, grading queue, gradebook, deadlines | V4 |
| `schedule` | Live sessions and calendars | V5 |
| `discussion` | Course threads and replies | V6 |
| `billing` | Checkout (Stripe / test), webhooks, refunds, revenue | V7 |
| `media` | Uploads (local / S3 / R2), resources, lesson video (Mux / URL) | V8 |
| `notification` | In-app inbox, email, deadline reminders | V9 |
| `analytics` | Admin and instructor dashboards, CSV report | V10 |

Modules talk to each other through small public services (`UserDirectory`, `CourseCatalog`, `Enrollments`,
`MediaFiles`, `AssessmentDeadlines`) and domain events — never through another module's repositories.

Full endpoint list: [`docs/API.md`](docs/API.md).

## Conventions

- Every tenant-owned table has `org_id`; services always scope queries with `CurrentUser.get().orgId()`.
- Errors are RFC 9457 `application/problem+json` with a stable `code` field.
- Lists return `{ items, page, size, total, totalPages }`.
- Route prefixes: `/api/auth`, `/api/public` (no login), `/api/me` (current user),
  `/api/instructor` (instructor or admin), `/api/admin` (admin only), `/api/webhooks`.
