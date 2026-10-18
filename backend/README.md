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

Configuration comes from environment variables — see `.env.example`.

## Tests

```bash
./gradlew test
```

Integration tests run against the local `orbitly_test` database (Flyway resets it).

## Conventions

- Every tenant-owned table has `org_id`; services always scope queries with `CurrentUser.get().orgId()`.
- Errors are RFC 9457 `application/problem+json` with a stable `code` field.
- Lists return `{ items, page, size, total, totalPages }`.
- Route prefixes: `/api/auth`, `/api/public` (no login), `/api/me` (current user),
  `/api/instructor` (instructor or admin), `/api/admin` (admin only), `/api/webhooks`.
