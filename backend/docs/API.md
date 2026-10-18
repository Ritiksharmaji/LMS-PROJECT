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

## Catalog (`backend-03-catalog`)

### Public catalog (no login)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/organizations/{org}/categories` | Categories with published course counts |
| GET | `/api/public/organizations/{org}/courses` | Search: `category` (slug), `level`, `price=free\|paid`, `q`, `sort=POPULAR\|RATING\|NEWEST\|PRICE_ASC\|PRICE_DESC`, `page`, `size` |
| GET | `/api/public/organizations/{org}/courses/{slug}` | Course page: card, description, outcomes, instructor, curriculum outline (no lesson content) |

### Wishlist (signed in)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me/wishlist` | Saved courses |
| PUT / DELETE | `/api/me/wishlist/{courseId}` | Save / unsave (idempotent) |

### Course authoring (INSTRUCTOR for own courses, ADMIN for any)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/instructor/courses` | Courses I teach (admins: every course) |
| POST | `/api/instructor/courses` | Create a draft |
| GET / PATCH | `/api/instructor/courses/{id}` | Editor view (with lesson content) / update. Admin-only fields: `instructorId`, `featured` |
| POST | `/api/instructor/courses/{id}/publish` | Publish (needs at least one lesson) |
| POST | `/api/instructor/courses/{id}/archive` | Hide from the catalog |
| DELETE | `/api/instructor/courses/{id}` | Delete an unpublished draft with no learners |
| PUT | `/api/instructor/courses/{id}/order` | Reorder all sections and lessons |
| POST | `/api/instructor/courses/{id}/sections` | Add a section |
| PATCH / DELETE | `/api/instructor/sections/{id}` | Rename / delete a section (and its lessons) |
| POST | `/api/instructor/sections/{id}/lessons` | Add a lesson: `kind` VIDEO, READING, QUIZ or ASSIGNMENT |
| PATCH / DELETE | `/api/instructor/lessons/{id}` | Update (incl. move to another `sectionId`) / delete |

### Categories (ADMIN)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/categories` | Create (`name`, `icon`, `hue`, `position`) |
| PUT / DELETE | `/api/admin/categories/{id}` | Update / delete (courses become uncategorized) |

Courses keep `durationMinutes`, `lessonCount`, `enrollmentCount`, `ratingAvg` and `ratingCount` up to date for cards.

## Learning (`backend-04-learning`)

### My learning (signed in)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/me/enrollments` | Enroll in a free course (`courseId`). Paid courses return `402 payment_required` |
| GET | `/api/me/enrollments?status=ACTIVE\|COMPLETED` | My courses with progress (most recently opened first) |
| GET | `/api/me/learning/summary` | In progress / completed counts, lessons done this week, minutes learned, continue-learning list |
| GET | `/api/me/courses/{courseId}/player` | Player sidebar: sections, lessons with `completed`, progress, `resumeLessonId` |
| GET | `/api/me/lessons/{lessonId}` | Lesson content, completion, video `positionSeconds`, previous/next lesson ids |
| POST / DELETE | `/api/me/lessons/{lessonId}/complete` | Mark a VIDEO/READING lesson done / not done |
| PUT | `/api/me/lessons/{lessonId}/position` | Save video resume position (`seconds`) |
| PUT / DELETE | `/api/me/courses/{courseId}/review` | Write or update my review (1–5 + comment) / delete it |

Access: enrolled learners, the course's instructor and admins (staff see `staffPreview: true`).
Finishing every lesson sets the enrollment to COMPLETED and issues a certificate code.

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/organizations/{org}/courses/{courseId}/reviews` | Paged reviews with reviewer name |
| GET | `/api/public/organizations/{org}/courses/{courseId}/reviews/summary` | Average, count, 1–5 histogram |
| GET | `/api/public/certificates/{code}` | Verify a certificate |

### Course staff (course instructor or ADMIN)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/instructor/courses/{courseId}/learners` | Roster with progress and last activity |
| POST | `/api/instructor/courses/{courseId}/learners` | Enroll members directly (`userIds`), free of charge |
| DELETE | `/api/instructor/enrollments/{id}` | Remove a learner |

## Assessment (`backend-05-assessment`)

### Learners
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me/lessons/{lessonId}/quiz` | Questions (no answer key), my attempts, attempts left, passed |
| POST | `/api/me/lessons/{lessonId}/quiz/attempts` | Submit `answers` (`{questionId: [optionIndex]}`); returns score, per-question result, explanations. Passing completes the lesson |
| GET | `/api/me/lessons/{lessonId}/assignment` | Instructions, due date, my submission and grade |
| POST | `/api/me/lessons/{lessonId}/assignment/submission` | Submit `body`, `linkUrl` and/or `fileKey`+`fileName`. One submission unless returned. Completes the lesson |
| GET | `/api/me/deadlines` | Open quizzes/assignments with due dates, soonest first (incl. 14 days overdue) |
| GET | `/api/me/grades` | My quiz results and assignment grades |

### Course staff
| Method | Path | Purpose |
|---|---|---|
| GET / PUT | `/api/instructor/lessons/{lessonId}/quiz` | Quiz editor: `passPercent` (default 70), `maxAttempts`, `dueAt`, `questions` (SINGLE/MULTIPLE) |
| GET / PUT | `/api/instructor/lessons/{lessonId}/assignment` | `instructions`, `dueAt`, `maxPoints`, `allowLate` |
| GET | `/api/instructor/grading-queue?courseId=` | Ungraded submissions, oldest first |
| GET | `/api/instructor/submissions/{id}` | One submission |
| PUT | `/api/instructor/submissions/{id}/grade` | `points` + `feedback` |
| POST | `/api/instructor/submissions/{id}/return` | Send back for revision with `feedback` |
| GET | `/api/instructor/courses/{courseId}/gradebook` | Columns (quizzes/assignments in curriculum order) × learners, averages |

## Schedule (`backend-06-schedule`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me/schedule?from=&to=` | My calendar: sessions of courses I'm enrolled in or teach (default: next 7 days, max 92) |
| GET | `/api/me/courses/{courseId}/sessions` | Upcoming sessions of one course |
| GET | `/api/instructor/sessions?from=&to=` | Sessions of courses I manage (admins: all) |
| POST | `/api/instructor/courses/{courseId}/sessions` | Schedule: `title`, `kind` (LIVE_CLASS, OFFICE_HOURS, STUDY_GROUP, WORKSHOP), `startsAt`, `endsAt`, `meetingUrl`, `location` |
| PATCH | `/api/instructor/sessions/{id}` | Edit or reschedule |
| POST | `/api/instructor/sessions/{id}/cancel` | Cancel (stays visible as cancelled) |
| DELETE | `/api/instructor/sessions/{id}` | Delete |

## Discussion (`backend-07-discussion`)

Anyone with access to the course (enrolled learners, its instructor, admins) can read and post.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me/courses/{courseId}/threads?lessonId=&unresolved=` | Threads, pinned first then most recent activity |
| POST | `/api/me/courses/{courseId}/threads` | Ask/share: `body`, optional `title`, `lessonId` |
| GET | `/api/me/threads/{id}` | Thread with replies (`author.staff` flags instructor/admin) |
| PATCH / DELETE | `/api/me/threads/{id}` | Author edits; author or staff deletes |
| PUT / DELETE | `/api/me/threads/{id}/pinned` | Staff pin / unpin |
| PUT / DELETE | `/api/me/threads/{id}/resolved` | Author or staff resolve / reopen |
| POST | `/api/me/threads/{id}/replies` | Reply |
| PATCH / DELETE | `/api/me/replies/{id}` | Author edits; author or staff deletes |
| PUT / DELETE | `/api/me/replies/{id}/answer` | Question author or staff mark the answer (resolves the thread) |

## Billing (`backend-08-billing`)

Hosted checkout: card details are entered on the provider's page, never sent to this API.
`BILLING_PROVIDER=test` (default) moves no money; `stripe` uses Stripe Checkout (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

### Learners
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/me/checkout` | Start buying a paid course (`courseId`) → `{orderId, checkoutUrl}`. Redirect to `checkoutUrl`; the provider returns to `/checkout/{orderId}/success` or `/cancel` |
| GET | `/api/me/orders` / `/api/me/orders/{id}` | My orders / poll one after returning from checkout |
| POST | `/api/me/orders/{id}/refund` | Refund within 30 days (removes the enrollment) |
| POST | `/api/me/orders/{id}/test-pay` | Test provider only: complete the payment |

Instructors and admins enroll in any course for free with `POST /api/me/enrollments`.

### Admin
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/orders?status=` | All orders |
| POST | `/api/admin/orders/{id}/refund` | Refund any paid order |
| GET | `/api/admin/revenue?days=30` | Paid and refunded totals per currency |

### Webhooks
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe events (signature-verified, idempotent): session completed / expired / failed |
