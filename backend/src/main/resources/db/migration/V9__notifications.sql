-- In-app notifications, email preferences, sent deadline reminders and password resets.

CREATE TABLE notifications (
    id          UUID PRIMARY KEY,
    org_id      UUID          NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id     UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind        VARCHAR(40)   NOT NULL,
    title       VARCHAR(200)  NOT NULL,
    body        VARCHAR(1000),
    link        VARCHAR(500),
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL,
    updated_at  TIMESTAMPTZ   NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications (user_id, org_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, org_id) WHERE read_at IS NULL;

CREATE TABLE notification_settings (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    email_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE reminders_sent (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_id   UUID        NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    due_at      TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, lesson_id, due_at)
);

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);
