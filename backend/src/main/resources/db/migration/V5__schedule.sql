-- Live sessions (classes, office hours, study groups, workshops) attached to a course.

CREATE TABLE live_sessions (
    id            UUID PRIMARY KEY,
    org_id        UUID          NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id     UUID          NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    host_id       UUID          NOT NULL REFERENCES users (id),
    title         VARCHAR(160)  NOT NULL,
    description   VARCHAR(4000),
    kind          VARCHAR(20)   NOT NULL CHECK (kind IN ('LIVE_CLASS', 'OFFICE_HOURS', 'STUDY_GROUP', 'WORKSHOP')),
    starts_at     TIMESTAMPTZ   NOT NULL,
    ends_at       TIMESTAMPTZ   NOT NULL,
    meeting_url   VARCHAR(1000),
    location      VARCHAR(300),
    cancelled_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL,
    updated_at    TIMESTAMPTZ   NOT NULL,
    CHECK (ends_at > starts_at)
);
CREATE INDEX idx_live_sessions_course_time ON live_sessions (course_id, starts_at);
CREATE INDEX idx_live_sessions_org_time ON live_sessions (org_id, starts_at);
