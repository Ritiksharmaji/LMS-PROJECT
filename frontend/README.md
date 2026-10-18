# Orbitly Web

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · TanStack Query · Lucide icons.
The UI follows the **Orbitly Portal** design: its tokens and `ob-*` component styles live in
[`src/app/globals.css`](src/app/globals.css) unchanged.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app expects the Spring Boot API at `API_URL` (default `http://localhost:8080`).

### Demo data

With the API running, seed a demo organization (Northfield University, 12 courses, instructors, students,
progress, reviews, sessions):

```bash
API_URL=http://localhost:8080 node scripts/seed-demo.mjs
```

Demo accounts are listed at the top of [`scripts/seed-demo.mjs`](scripts/seed-demo.mjs).

## How it talks to the API

```
Browser ──► Next.js ──► Spring Boot API
            │  /api/session/*  login, signup, invite, switch org, logout → sets httpOnly cookies
            │  /api/backend/*  forwards to /api/* with the access token, refreshes it when expired
            └  server components read the public catalog directly (cached with `use cache`)
```

- Tokens never reach browser JavaScript: `orb_at` (access) and `orb_rt` (refresh) are httpOnly cookies.
- `orb_role` is readable and only used by [`src/proxy.ts`](src/proxy.ts) to route people to `/learn`, `/teach`
  or `/admin`. The API authorizes every request.
- Public pages (landing, catalog, course pages) are server-rendered and cached for SEO; signed-in areas load data
  on the client through `/api/backend`.

## Structure

```
src/
  app/            routes (public site, auth, /learn, /teach, /admin, BFF route handlers)
  components/ui/  Orbitly design system components
  lib/            API clients, session cookies, types, formatting
  proxy.ts        route protection (Next.js 16 "proxy", formerly middleware)
scripts/          demo seed
```
