"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Badge, Button, Card, Checkbox, ErrorState, Icon, Radio, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { due } from "@/lib/format";
import type { AttemptResult, QuizView } from "@/lib/types";

export function QuizLesson({ lessonId, title, onPassed }: { lessonId: string; title: string; onPassed: () => void }) {
  const qc = useQueryClient();
  const quiz = useQuery({ queryKey: ["quiz", lessonId], queryFn: () => api.get<QuizView>(`/me/lessons/${lessonId}/quiz`) });
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const submit = useMutation({
    mutationFn: () => api.post<AttemptResult>(`/me/lessons/${lessonId}/quiz/attempts`, { answers }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["quiz", lessonId] });
      if (r.lessonCompleted) onPassed();
    },
  });

  if (quiz.isLoading) return <Skeleton height={360} />;
  if (quiz.error || !quiz.data) return <ErrorState message={quiz.error?.message ?? "This quiz isn't ready yet."} />;
  const q = quiz.data;
  const outcome = result ? new Map(result.questions.map((r) => [r.questionId, r])) : null;
  const answered = q.questions.every((x) => (answers[x.id]?.length ?? 0) > 0);
  const best = q.attempts.reduce((m, a) => Math.max(m, a.percent), 0);
  const noAttemptsLeft = q.attemptsLeft === 0;
  const badge = result
    ? result.attempt.passed
      ? <Badge tone="success" dot>{result.attempt.percent}% · Passed</Badge>
      : <Badge tone="warning" dot>{result.attempt.percent}% · {q.passPercent}% to pass</Badge>
    : q.passed
      ? <Badge tone="success" dot>Passed · best {best}%</Badge>
      : q.dueAt
        ? <Badge tone={due(q.dueAt).tone}>{due(q.dueAt).label}</Badge>
        : <Badge>{q.questions.length} questions</Badge>;

  const toggle = (questionId: string, index: number, multiple: boolean) =>
    setAnswers((a) => {
      const cur = a[questionId] ?? [];
      return { ...a, [questionId]: multiple ? (cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index]) : [index] };
    });

  return (
    <Card padding={28}>
      <div className="mb-[18px] flex items-center justify-between gap-3">
        <div style={{ font: "600 20px var(--font-display)", color: "var(--text-strong)" }}>{title}</div>
        {badge}
      </div>
      <div className="flex flex-col gap-[22px]">
        {q.questions.map((question, i) => {
          const r = outcome?.get(question.id);
          const multiple = question.kind === "MULTIPLE";
          return (
            <fieldset key={question.id} style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ font: "600 15px var(--font-body)", color: "var(--text-strong)", marginBottom: 10 }}>
                {i + 1}. {question.prompt}
                {multiple && <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 13 }}> (select all that apply)</span>}
              </legend>
              <div className="flex flex-col gap-2">
                {question.options.map((opt, j) => {
                  const selected = (answers[question.id] ?? []).includes(j);
                  const right = !!r && r.correctOptions.includes(j);
                  const wrong = !!r && selected && !right;
                  const Control = multiple ? Checkbox : Radio;
                  return (
                    <div key={j} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid " + (right ? "var(--success)" : wrong ? "var(--danger)" : selected ? "var(--coral-400)" : "var(--border-default)"), background: right ? "var(--success-soft)" : wrong ? "var(--danger-soft)" : "#fff" }}>
                      <Control name={"q" + question.id} label={opt} checked={selected} disabled={!!result} onChange={() => toggle(question.id, j, multiple)} />
                    </div>
                  );
                })}
              </div>
              {r?.explanation && (
                <div className="mt-2 flex gap-2" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  <Icon name="info" size={16} />
                  {r.explanation}
                </div>
              )}
            </fieldset>
          );
        })}
      </div>
      {submit.error && <div className="ob-help ob-help--error" style={{ marginTop: 14 }}>{submit.error.message}</div>}
      <div className="mt-[22px] flex flex-wrap items-center gap-2.5">
        {!result ? (
          <Button disabled={!answered || noAttemptsLeft} loading={submit.isPending} onClick={() => submit.mutate()}>
            Submit answers
          </Button>
        ) : result.attempt.passed ? (
          <Badge tone="success" dot style={{ height: 32, padding: "0 14px", fontSize: 13 }}>
            Passed — lesson marked complete
          </Badge>
        ) : result.attemptsLeft === 0 ? (
          <Badge tone="danger" style={{ height: 32, padding: "0 14px", fontSize: 13 }}>
            No attempts left
          </Badge>
        ) : (
          <Button variant="secondary" iconLeft="rotate-ccw" onClick={() => { setResult(null); setAnswers({}); }}>
            Try again
          </Button>
        )}
        {q.maxAttempts != null && (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {(result?.attemptsLeft ?? q.attemptsLeft) ?? 0} of {q.maxAttempts} attempts left
          </span>
        )}
      </div>
    </Card>
  );
}
