-- Enrollments, per-lesson progress and course reviews.

CREATE TABLE enrollments (
    id                UUID PRIMARY KEY,
    org_id            UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id         UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
    source            VARCHAR(20) NOT NULL CHECK (source IN ('FREE', 'PURCHASE', 'ASSIGNED')),
    last_lesson_id    UUID        REFERENCES lessons (id) ON DELETE SET NULL,
    last_accessed_at  TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    certificate_code  VARCHAR(20) UNIQUE,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, course_id)
);
CREATE INDEX idx_enrollments_org_user ON enrollments (org_id, user_id);
CREATE INDEX idx_enrollments_course ON enrollments (course_id);

CREATE TABLE lesson_progress (
    id                UUID PRIMARY KEY,
    org_id            UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id         UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    lesson_id         UUID        NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    position_seconds  INTEGER     NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user_course ON lesson_progress (user_id, course_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress (org_id, completed_at) WHERE completed_at IS NOT NULL;

CREATE TABLE reviews (
    id          UUID PRIMARY KEY,
    org_id      UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id   UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     VARCHAR(4000),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (course_id, user_id)
);
CREATE INDEX idx_reviews_course ON reviews (course_id, created_at DESC);
