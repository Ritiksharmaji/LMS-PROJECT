-- Uploaded files, course/lesson resources and lesson videos.

CREATE TABLE media_files (
    id            UUID PRIMARY KEY,
    org_id        UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    owner_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id     UUID         REFERENCES courses (id) ON DELETE CASCADE,
    purpose       VARCHAR(30)  NOT NULL CHECK (purpose IN ('AVATAR', 'ORG_LOGO', 'COURSE_COVER', 'RESOURCE', 'SUBMISSION')),
    storage_key   VARCHAR(500) NOT NULL UNIQUE,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(120) NOT NULL,
    size_bytes    BIGINT       NOT NULL CHECK (size_bytes > 0),
    status        VARCHAR(20)  NOT NULL CHECK (status IN ('PENDING', 'READY')),
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_media_files_owner ON media_files (owner_id);

CREATE TABLE course_resources (
    id          UUID PRIMARY KEY,
    org_id      UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id   UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    lesson_id   UUID         REFERENCES lessons (id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    file_id     UUID         REFERENCES media_files (id) ON DELETE CASCADE,
    url         VARCHAR(1000),
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    CHECK ((file_id IS NULL) <> (url IS NULL))
);
CREATE INDEX idx_course_resources_course ON course_resources (course_id, position);

CREATE TABLE lesson_videos (
    id                UUID PRIMARY KEY,
    org_id            UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    lesson_id         UUID         NOT NULL UNIQUE REFERENCES lessons (id) ON DELETE CASCADE,
    provider          VARCHAR(20)  NOT NULL CHECK (provider IN ('MUX', 'URL')),
    status            VARCHAR(20)  NOT NULL CHECK (status IN ('WAITING_UPLOAD', 'PROCESSING', 'READY', 'ERRORED')),
    mux_upload_id     VARCHAR(255) UNIQUE,
    mux_asset_id      VARCHAR(255) UNIQUE,
    playback_id       VARCHAR(255),
    url               VARCHAR(1000),
    duration_seconds  INTEGER,
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL
);
