# Orbitly API reference

All endpoints are JSON. Authenticated calls send `Authorization: Bearer <accessToken>`.
Errors are `application/problem+json` with a `code` field. Live docs: `/api/docs/ui`.

## Identity (`backend-02-identity`)

### Auth — public
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register-organization` | Create an organization; caller becomes its first ADMIN |
| POST | `/api/auth/signup` | Student self-signup (`orgSlug`, `fullName`, `email`, `password`) |
| POST | `/api/auth/login` | `orgSlug` + `email` + `password` → tokens and role |
| POST | `/api/auth/refresh` | Rotate the refresh token (single use; replay revokes all sessions) |
| POST | `/api/auth/logout` | Revoke a refresh token |
| GET | `/api/auth/invites/{token}` | Invite preview (org, role, whether the email already has an account) |
| POST | `/api/auth/invites/accept` | Accept an invite (new password, or existing account's password) |
| GET | `/api/public/organizations/{slug}` | Organization name/logo for the sign-in screen |

Access tokens last 15 minutes and carry `sub` (user id), `org`, `role`, `name`.
Refresh tokens last 30 days.

### Current user
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me` | User, organization and role |
| PATCH | `/api/me` | Update `fullName`, `avatarUrl` |
| POST | `/api/me/password` | Change password (signs out other sessions) |
| GET | `/api/me/organizations` | Every organization this account belongs to |
| POST | `/api/me/switch-organization` | New tokens scoped to another organization |

### Admin — People and seats (ADMIN only)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/members?role=&q=&page=&size=` | Search members |
| GET | `/api/admin/members/counts` | Everyone / students / instructors / admins |
| PATCH | `/api/admin/members/{id}` | Change `role` or `status` (ACTIVE/SUSPENDED) |
| DELETE | `/api/admin/members/{id}` | Remove a member |
| POST | `/api/admin/invites` | Invite `emails[]` with a `role`; returns invite links |
| GET | `/api/admin/invites` | Pending invites |
| DELETE | `/api/admin/invites/{id}` | Revoke an invite |
| GET / PATCH | `/api/admin/organization` | Name, logo, `seatLimit`, `selfSignup`; shows `seatsUsed` |

Rules: an organization always keeps at least one active admin; seat limits cap active members plus pending invites.
