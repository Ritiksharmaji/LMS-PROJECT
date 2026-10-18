# Orbitly LMS

A multi-tenant learning management system with three roles — **Student**, **Instructor** and **Admin** — built from the Orbitly Portal design.

| Part | Stack |
|---|---|
| `backend/` | Spring Boot 3 · Java 17 · PostgreSQL · Flyway · Spring Security (JWT) |
| `frontend/` | Next.js · TypeScript · Tailwind CSS (Orbitly design system) |

## Branches

- `main` — stable
- `development` — integration branch
- `backend` → `backend/<feature>` — API work, merged feature by feature
- `frontend` → `frontend/<module>` — UI work, merged module by module
- `frontend/complete` — the full Next.js app assembled in one branch (not merged)
