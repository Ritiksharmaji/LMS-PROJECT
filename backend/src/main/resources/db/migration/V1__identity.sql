-- Organizations (tenants), users, memberships, invites and refresh tokens.

CREATE TABLE organizations (
    id            UUID PRIMARY KEY,
    name          VARCHAR(160) NOT NULL,
    slug          VARCHAR(80)  NOT NULL UNIQUE,
    logo_url      VARCHAR(500),
    seat_limit    INTEGER CHECK (seat_limit IS NULL OR seat_limit >= 0),
    self_signup   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(160) NOT NULL,
    avatar_url    VARCHAR(500),
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE memberships (
    id             UUID PRIMARY KEY,
    org_id         UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role           VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'INSTRUCTOR', 'ADMIN')),
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    last_active_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL,
    UNIQUE (org_id, user_id)
);
CREATE INDEX idx_memberships_user ON memberships (user_id);
CREATE INDEX idx_memberships_org_role ON memberships (org_id, role);

CREATE TABLE invites (
    id          UUID PRIMARY KEY,
    org_id      UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    email       VARCHAR(254) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('STUDENT', 'INSTRUCTOR', 'ADMIN')),
    token_hash  VARCHAR(64)  NOT NULL UNIQUE,
    invited_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_invites_org ON invites (org_id) WHERE accepted_at IS NULL;

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    org_id      UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
