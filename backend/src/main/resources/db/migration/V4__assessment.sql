-- Quizzes (auto-graded) and assignments (instructor-graded), each attached to one lesson.

CREATE TABLE quizzes (
    id            UUID PRIMARY KEY,
    org_id        UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id     UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    lesson_id     UUID        NOT NULL UNIQUE REFERENCES lessons (id) ON DELETE CASCADE,
    pass_percent  INTEGER     NOT NULL DEFAULT 70 CHECK (pass_percent BETWEEN 0 AND 100),
    max_attempts  INTEGER     CHECK (max_attempts IS NULL OR max_attempts > 0),
    due_at        TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_quizzes_course ON quizzes (course_id);

CREATE TABLE quiz_questions (
    id           UUID PRIMARY KEY,
    org_id       UUID          NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    quiz_id      UUID          NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    position     INTEGER       NOT NULL,
    prompt       VARCHAR(2000) NOT NULL,
    kind         VARCHAR(20)   NOT NULL CHECK (kind IN ('SINGLE', 'MULTIPLE')),
    options      TEXT[]        NOT NULL,
    correct      INTEGER[]     NOT NULL,
    explanation  VARCHAR(2000),
    points       INTEGER       NOT NULL DEFAULT 1 CHECK (points > 0),
    created_at   TIMESTAMPTZ   NOT NULL,
    updated_at   TIMESTAMPTZ   NOT NULL
);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions (quiz_id, position);

CREATE TABLE quiz_attempts (
    id            UUID PRIMARY KEY,
    org_id        UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    quiz_id       UUID        NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    score         INTEGER     NOT NULL,
    max_score     INTEGER     NOT NULL,
    percent       INTEGER     NOT NULL,
    passed        BOOLEAN     NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_quiz_attempts_quiz_user ON quiz_attempts (quiz_id, user_id);

CREATE TABLE quiz_answers (
    id           UUID PRIMARY KEY,
    org_id       UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    attempt_id   UUID        NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
    question_id  UUID        NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
    selected     INTEGER[]   NOT NULL,
    correct      BOOLEAN     NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_quiz_answers_attempt ON quiz_answers (attempt_id);

CREATE TABLE assignments (
    id            UUID PRIMARY KEY,
    org_id        UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    course_id     UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    lesson_id     UUID        NOT NULL UNIQUE REFERENCES lessons (id) ON DELETE CASCADE,
    instructions  TEXT,
    due_at        TIMESTAMPTZ,
    max_points    INTEGER     NOT NULL DEFAULT 100 CHECK (max_points > 0),
    allow_late    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_assignments_course ON assignments (course_id);

CREATE TABLE submissions (
    id             UUID PRIMARY KEY,
    org_id         UUID          NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    assignment_id  UUID          NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
    course_id      UUID          NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    user_id        UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status         VARCHAR(20)   NOT NULL CHECK (status IN ('SUBMITTED', 'GRADED', 'RETURNED')),
    body           TEXT,
    link_url       VARCHAR(1000),
    file_key       VARCHAR(500),
    file_name      VARCHAR(255),
    submitted_at   TIMESTAMPTZ   NOT NULL,
    late           BOOLEAN       NOT NULL DEFAULT FALSE,
    points         INTEGER,
    feedback       TEXT,
    graded_by      UUID REFERENCES users (id) ON DELETE SET NULL,
    graded_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL,
    updated_at     TIMESTAMPTZ   NOT NULL,
    UNIQUE (assignment_id, user_id)
);
CREATE INDEX idx_submissions_queue ON submissions (org_id, status, submitted_at);
CREATE INDEX idx_submissions_course ON submissions (course_id);
