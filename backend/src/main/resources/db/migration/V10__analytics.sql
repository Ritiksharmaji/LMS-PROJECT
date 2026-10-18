-- Append-only activity log that powers dashboards ("active learners", activity charts, recent activity).

CREATE TABLE activity_events (
    id           UUID PRIMARY KEY,
    org_id       UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id      UUID        REFERENCES users (id) ON DELETE CASCADE,
    course_id    UUID        REFERENCES courses (id) ON DELETE CASCADE,
    kind         VARCHAR(40) NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_activity_org_time ON activity_events (org_id, occurred_at DESC);
CREATE INDEX idx_activity_course_time ON activity_events (course_id, occurred_at DESC);
