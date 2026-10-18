-- Course purchases.

CREATE TABLE orders (
    id                   UUID PRIMARY KEY,
    org_id               UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id              UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id            UUID         NOT NULL REFERENCES courses (id),
    amount_cents         INTEGER      NOT NULL CHECK (amount_cents > 0),
    currency             VARCHAR(3)   NOT NULL,
    status               VARCHAR(20)  NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
    provider             VARCHAR(20)  NOT NULL,
    provider_session_id  VARCHAR(255) UNIQUE,
    provider_payment_id  VARCHAR(255),
    paid_at              TIMESTAMPTZ,
    refunded_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_org_status ON orders (org_id, status, created_at DESC);
