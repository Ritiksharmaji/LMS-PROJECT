-- Course discussions: threads (optionally about one lesson) and replies.

CREATE TABLE discussion_threads (
    id                UUID PRIMARY KEY,
    org_id            UUID          NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id         UUID          NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    lesson_id         UUID          REFERENCES lessons (id) ON DELETE SET NULL,
    author_id         UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title             VARCHAR(200),
    body              VARCHAR(10000) NOT NULL,
    pinned            BOOLEAN       NOT NULL DEFAULT FALSE,
    resolved          BOOLEAN       NOT NULL DEFAULT FALSE,
    reply_count       INTEGER       NOT NULL DEFAULT 0,
    last_activity_at  TIMESTAMPTZ   NOT NULL,
    edited_at         TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL
);
CREATE INDEX idx_threads_course ON discussion_threads (course_id, pinned DESC, last_activity_at DESC);

CREATE TABLE discussion_replies (
    id          UUID PRIMARY KEY,
    org_id      UUID           NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    thread_id   UUID           NOT NULL REFERENCES discussion_threads (id) ON DELETE CASCADE,
    author_id   UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body        VARCHAR(10000) NOT NULL,
    answer      BOOLEAN        NOT NULL DEFAULT FALSE,
    edited_at   TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ    NOT NULL,
    updated_at  TIMESTAMPTZ    NOT NULL
);
CREATE INDEX idx_replies_thread ON discussion_replies (thread_id, created_at);
