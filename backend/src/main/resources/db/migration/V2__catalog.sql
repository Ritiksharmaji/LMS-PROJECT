-- Course catalog: categories, courses, sections, lessons and wishlists.

CREATE TABLE categories (
    id          UUID PRIMARY KEY,
    org_id      UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name        VARCHAR(80)  NOT NULL,
    slug        VARCHAR(80)  NOT NULL,
    icon        VARCHAR(40)  NOT NULL DEFAULT 'book-open',
    hue         VARCHAR(20)  NOT NULL DEFAULT 'orbit',
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    UNIQUE (org_id, slug)
);

CREATE TABLE courses (
    id                UUID PRIMARY KEY,
    org_id            UUID          NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    instructor_id     UUID          NOT NULL REFERENCES users (id),
    category_id       UUID          REFERENCES categories (id) ON DELETE SET NULL,
    slug              VARCHAR(120)  NOT NULL,
    title             VARCHAR(160)  NOT NULL,
    tagline           VARCHAR(300),
    description       TEXT,
    outcomes          TEXT[]        NOT NULL DEFAULT '{}',
    level             VARCHAR(20)   NOT NULL DEFAULT 'BEGINNER'
                                    CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    price_cents       INTEGER       NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    currency          VARCHAR(3)    NOT NULL DEFAULT 'USD',
    hue               VARCHAR(20)   NOT NULL DEFAULT 'orbit',
    icon              VARCHAR(40)   NOT NULL DEFAULT 'book-open',
    cover_url         VARCHAR(500),
    status            VARCHAR(20)   NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    featured          BOOLEAN       NOT NULL DEFAULT FALSE,
    published_at      TIMESTAMPTZ,
    duration_minutes  INTEGER       NOT NULL DEFAULT 0,
    lesson_count      INTEGER       NOT NULL DEFAULT 0,
    enrollment_count  INTEGER       NOT NULL DEFAULT 0,
    rating_avg        NUMERIC(3, 2) NOT NULL DEFAULT 0,
    rating_count      INTEGER       NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    UNIQUE (org_id, slug)
);
CREATE INDEX idx_courses_org_status ON courses (org_id, status);
CREATE INDEX idx_courses_instructor ON courses (instructor_id);
CREATE INDEX idx_courses_category ON courses (category_id);

CREATE TABLE sections (
    id          UUID PRIMARY KEY,
    org_id      UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id   UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title       VARCHAR(160) NOT NULL,
    position    INTEGER      NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_sections_course ON sections (course_id, position);

CREATE TABLE lessons (
    id                UUID PRIMARY KEY,
    org_id            UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id         UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    section_id        UUID         NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
    title             VARCHAR(160) NOT NULL,
    kind              VARCHAR(20)  NOT NULL CHECK (kind IN ('VIDEO', 'READING', 'QUIZ', 'ASSIGNMENT')),
    position          INTEGER      NOT NULL,
    duration_minutes  INTEGER      NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    content           TEXT,
    preview           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_lessons_section ON lessons (section_id, position);
CREATE INDEX idx_lessons_course ON lessons (course_id);

CREATE TABLE wishlist_items (
    id          UUID PRIMARY KEY,
    org_id      UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id   UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, course_id)
);
