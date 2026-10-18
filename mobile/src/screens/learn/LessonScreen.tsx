import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import Video, { type VideoRef } from 'react-native-video';

import { Icon } from '../../components/Icon';
import { Markdown } from '../../components/Markdown';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FadeIn,
  Field,
  Loading,
  Screen,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, dateTime } from '../../lib/format';
import type {
  AssignmentView,
  AttemptResult,
  CompletionResult,
  LessonContent,
  QuizView,
  ResourceView,
  SubmissionView,
  VideoView,
} from '../../lib/types';
import type { RootScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function LessonScreen({ navigation, route }: RootScreen<'Lesson'>) {
  const p = usePalette();
  const qc = useQueryClient();
  const { lessonId, courseId } = route.params;
  const lesson = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get<LessonContent>(`/me/lessons/${lessonId}`),
  });
  const resources = useQuery({
    queryKey: ['resources', courseId, lessonId],
    queryFn: () =>
      api.get<ResourceView[]>(
        `/me/courses/${courseId}/resources?lessonId=${lessonId}`,
      ),
  });
  const l = lesson.data;
  useEffect(() => {
    if (l)
      navigation.setOptions({
        title:
          l.kind === 'QUIZ'
            ? 'Quiz'
            : l.kind === 'ASSIGNMENT'
            ? 'Assignment'
            : l.kind === 'VIDEO'
            ? 'Video'
            : 'Reading',
      });
  }, [l, navigation]);

  const refreshProgress = (r?: CompletionResult) => {
    qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
    qc.invalidateQueries({ queryKey: ['player', courseId] });
    qc.invalidateQueries({ queryKey: ['enrollments'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
    if (r?.certificateCode && r.status === 'COMPLETED')
      Alert.alert(
        'Course complete 🎉',
        'You finished every lesson and earned a certificate.',
        [
          { text: 'Later' },
          {
            text: 'View certificate',
            onPress: () =>
              navigation.navigate('Certificate', { code: r.certificateCode! }),
          },
        ],
      );
  };
  const complete = useMutation({
    mutationFn: (done: boolean) =>
      done
        ? api.post<CompletionResult>(`/me/lessons/${lessonId}/complete`)
        : api.del<CompletionResult>(`/me/lessons/${lessonId}/complete`),
    onSuccess: refreshProgress,
    onError: e => Alert.alert("Couldn't update", errorMessage(e)),
  });

  if (lesson.error)
    return (
      <Screen>
        <ErrorState
          message={errorMessage(lesson.error)}
          onRetry={lesson.refetch}
        />
      </Screen>
    );
  if (!l) return <Loading />;
  const go = (id: string | null) =>
    id && navigation.replace('Lesson', { lessonId: id, courseId });

  return (
    <Screen>
      {l.kind === 'VIDEO' && (
        <VideoPlayer
          lesson={l}
          onEnded={() => !l.completed && complete.mutate(true)}
        />
      )}
      <FadeIn style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {l.completed && <Badge label="Completed" tone="success" dot />}
          {l.durationMinutes > 0 && (
            <Badge label={`${l.durationMinutes} min`} />
          )}
        </View>
        <T v="h1">{l.title}</T>
      </FadeIn>

      {l.kind === 'READING' && (
        <Card>
          <Markdown source={l.content ?? 'This lesson has no text yet.'} />
        </Card>
      )}
      {l.kind === 'VIDEO' && !!l.content && <Markdown source={l.content} />}
      {l.kind === 'QUIZ' && (
        <Quiz lessonId={lessonId} onDone={refreshProgress} />
      )}
      {l.kind === 'ASSIGNMENT' && (
        <Assignment lessonId={lessonId} onDone={refreshProgress} />
      )}

      {(l.kind === 'VIDEO' || l.kind === 'READING') && (
        <Button
          title={
            l.completed ? 'Completed — mark as not done' : 'Mark as complete'
          }
          variant={l.completed ? 'secondary' : 'primary'}
          icon={l.completed ? 'circle-check' : 'check'}
          loading={complete.isPending}
          onPress={() => complete.mutate(!l.completed)}
        />
      )}

      {!!resources.data?.length && (
        <Card style={{ gap: 10 }}>
          <T v="h3">Resources</T>
          {resources.data.map(r => (
            <Pressable
              key={r.id}
              onPress={() => openResource(r)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Icon
                name={r.kind === 'LINK' ? 'link' : 'file-text'}
                size={18}
                color={p.accentText}
              />
              <T v="label" color={p.accentText} style={{ flex: 1 }}>
                {r.title}
              </T>
              <Icon name="external-link" size={14} color={p.muted} />
            </Pressable>
          ))}
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          title="Previous"
          variant="secondary"
          icon="arrow-left"
          disabled={!l.previousLessonId}
          onPress={() => go(l.previousLessonId)}
          style={{ flex: 1 }}
        />
        <Button
          title="Next"
          variant="secondary"
          iconRight="arrow-right"
          disabled={!l.nextLessonId}
          onPress={() => go(l.nextLessonId)}
          style={{ flex: 1 }}
        />
      </View>
      <Button
        title="Ask a question"
        variant="ghost"
        icon="message-square"
        onPress={() => navigation.navigate('NewThread', { courseId, lessonId })}
      />
    </Screen>
  );
}

async function openResource(r: ResourceView) {
  try {
    const url =
      r.kind === 'LINK'
        ? r.url
        : (await api.get<{ url: string }>(`/me/files/${r.fileId}/download`))
            .url;
    if (url) Linking.openURL(url);
  } catch (e) {
    Alert.alert("Couldn't open the file", errorMessage(e));
  }
}

// ---- Video -------------------------------------------------------------------------------------

function VideoPlayer({
  lesson,
  onEnded,
}: {
  lesson: LessonContent;
  onEnded: () => void;
}) {
  const p = usePalette();
  const ref = useRef<VideoRef>(null);
  const last = useRef(0);
  const video = useQuery({
    queryKey: ['video', lesson.id],
    queryFn: () => api.get<VideoView>(`/me/lessons/${lesson.id}/video`),
  });
  const save = (seconds: number) =>
    api
      .put(`/me/lessons/${lesson.id}/position`, {
        seconds: Math.floor(seconds),
      })
      .catch(() => {});
  const box = {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden' as const,
    backgroundColor: p.nightDeep,
    marginHorizontal: -4,
  };
  if (!video.data?.streamUrl)
    return (
      <View
        style={[
          box,
          { alignItems: 'center', justifyContent: 'center', gap: 8 },
        ]}
      >
        <Icon name="video" size={32} color={p.nightText} />
        <T v="small" color={p.nightText}>
          {video.isLoading
            ? 'Loading video…'
            : video.data?.status === 'PROCESSING'
            ? 'Video is processing'
            : 'No video for this lesson yet'}
        </T>
      </View>
    );
  return (
    <View style={box}>
      <Video
        ref={ref}
        source={{ uri: video.data.streamUrl }}
        style={{ flex: 1 }}
        controls
        resizeMode="contain"
        onLoad={() =>
          lesson.positionSeconds > 5 &&
          ref.current?.seek(lesson.positionSeconds)
        }
        onProgress={({ currentTime }) => {
          if (Math.abs(currentTime - last.current) >= 15) {
            last.current = currentTime;
            save(currentTime);
          }
        }}
        onEnd={onEnded}
      />
    </View>
  );
}

// ---- Quiz --------------------------------------------------------------------------------------

function Quiz({
  lessonId,
  onDone,
}: {
  lessonId: string;
  onDone: (r?: CompletionResult) => void;
}) {
  const p = usePalette();
  const quiz = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => api.get<QuizView>(`/me/lessons/${lessonId}/quiz`),
  });
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const submit = useMutation({
    mutationFn: () =>
      api.post<AttemptResult>(`/me/lessons/${lessonId}/quiz/attempts`, {
        answers,
      }),
    onSuccess: r => {
      setResult(r);
      quiz.refetch();
      if (r.lessonCompleted) onDone();
    },
    onError: e => Alert.alert("Couldn't submit", errorMessage(e)),
  });
  if (quiz.error)
    return (
      <ErrorState message={errorMessage(quiz.error)} onRetry={quiz.refetch} />
    );
  const q = quiz.data;
  if (!q) return <Loading />;
  const best = q.attempts.reduce((m, a) => Math.max(m, a.percent), 0);
  const outOfAttempts = q.attemptsLeft === 0;
  const pick = (qid: string, i: number, multiple: boolean) =>
    setAnswers(a => {
      const cur = a[qid] ?? [];
      return {
        ...a,
        [qid]: multiple
          ? cur.includes(i)
            ? cur.filter(x => x !== i)
            : [...cur, i]
          : [i],
      };
    });

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Badge label={`Pass mark ${q.passPercent}%`} tone="orbit" />
        <Badge
          label={
            q.attemptsLeft == null
              ? 'Unlimited attempts'
              : `${q.attemptsLeft} attempts left`
          }
        />
        {q.dueAt && <Badge label={`Due ${date(q.dueAt)}`} tone="warning" />}
        {q.attempts.length > 0 && (
          <Badge
            label={`Best ${best}%`}
            tone={q.passed ? 'success' : 'neutral'}
          />
        )}
      </Card>
      {result && (
        <FadeIn>
          <Card
            style={{
              gap: 6,
              backgroundColor: result.attempt.passed
                ? p.successSoft
                : p.warningSoft,
              borderColor: 'transparent',
            }}
          >
            <T
              v="h2"
              color={result.attempt.passed ? p.successText : p.warningText}
            >
              {result.attempt.passed ? 'Passed' : 'Not quite'} —{' '}
              {result.attempt.percent}%
            </T>
            <T
              v="small"
              color={result.attempt.passed ? p.successText : p.warningText}
            >
              {result.attempt.score} of {result.attempt.maxScore} points.{' '}
              {result.attempt.passed
                ? 'This lesson is now complete.'
                : result.attemptsLeft === 0
                ? 'No attempts left.'
                : 'Review the explanations and try again.'}
            </T>
          </Card>
        </FadeIn>
      )}
      {q.questions.map((question, qi) => {
        const multiple = question.kind === 'MULTIPLE';
        const r = result?.questions.find(x => x.questionId === question.id);
        return (
          <Card key={question.id} style={{ gap: 10 }}>
            <T v="overline">
              Question {qi + 1}
              {multiple ? ' · select all that apply' : ''}
            </T>
            <T v="h3">{question.prompt}</T>
            {question.options.map((opt, i) => {
              const selected = (answers[question.id] ?? []).includes(i);
              const right = r?.correctOptions.includes(i);
              const wrong = r && selected && !right;
              const border = r
                ? right
                  ? p.success
                  : wrong
                  ? p.danger
                  : p.border
                : selected
                ? p.accent
                : p.borderStrong;
              return (
                <Pressable
                  key={i}
                  disabled={!!result}
                  onPress={() => pick(question.id, i, multiple)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: border,
                    backgroundColor: selected && !r ? p.accentSoft : p.card,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: multiple ? 6 : 10,
                      borderWidth: 1.5,
                      borderColor: selected ? p.accent : p.borderStrong,
                      backgroundColor: selected ? p.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected && (
                      <Icon name="check" size={12} color="#fff" weight="bold" />
                    )}
                  </View>
                  <T style={{ flex: 1 }}>{opt}</T>
                  {r && right && (
                    <Icon name="circle-check" size={18} color={p.success} />
                  )}
                </Pressable>
              );
            })}
            {r?.explanation && (
              <T v="small" color={p.muted}>
                {r.explanation}
              </T>
            )}
          </Card>
        );
      })}
      {result ? (
        !result.attempt.passed &&
        result.attemptsLeft !== 0 && (
          <Button
            title="Try again"
            icon="refresh-cw"
            variant="secondary"
            onPress={() => {
              setResult(null);
              setAnswers({});
            }}
          />
        )
      ) : (
        <Button
          title={outOfAttempts ? 'No attempts left' : 'Submit answers'}
          icon="send"
          loading={submit.isPending}
          disabled={
            outOfAttempts ||
            q.questions.some(x => !(answers[x.id] ?? []).length)
          }
          onPress={() => submit.mutate()}
        />
      )}
    </View>
  );
}

// ---- Assignment --------------------------------------------------------------------------------

function Assignment({
  lessonId,
  onDone,
}: {
  lessonId: string;
  onDone: () => void;
}) {
  const p = usePalette();
  const a = useQuery({
    queryKey: ['assignment', lessonId],
    queryFn: () =>
      api.get<AssignmentView>(`/me/lessons/${lessonId}/assignment`),
  });
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const submit = useMutation({
    mutationFn: () =>
      api.post<SubmissionView>(
        `/me/lessons/${lessonId}/assignment/submission`,
        { body: body.trim() || undefined, linkUrl: link.trim() || undefined },
      ),
    onSuccess: () => {
      a.refetch();
      onDone();
    },
    onError: e => Alert.alert("Couldn't submit", errorMessage(e)),
  });
  if (a.error)
    return <ErrorState message={errorMessage(a.error)} onRetry={a.refetch} />;
  if (!a.data) return <Loading />;
  const s = a.data.submission;
  const canSubmit = !s || s.status === 'RETURNED';
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge label={`${a.data.maxPoints} points`} tone="orbit" />
          {a.data.dueAt && (
            <Badge label={`Due ${dateTime(a.data.dueAt)}`} tone="warning" />
          )}
          {!a.data.allowLate && <Badge label="No late work" />}
        </View>
        <Markdown source={a.data.instructions ?? 'No instructions.'} />
      </Card>
      {s && (
        <Card style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <T v="h3">Your submission</T>
            <Badge
              label={
                s.status === 'GRADED'
                  ? `${s.points}/${s.maxPoints}`
                  : s.status === 'RETURNED'
                  ? 'Returned'
                  : 'Submitted'
              }
              tone={
                s.status === 'GRADED'
                  ? 'success'
                  : s.status === 'RETURNED'
                  ? 'warning'
                  : 'info'
              }
            />
          </View>
          <T v="small" color={p.muted}>
            Sent {dateTime(s.submittedAt)}
            {s.late ? ' · late' : ''}
          </T>
          {s.body && <T>{s.body}</T>}
          {s.linkUrl && (
            <T
              v="label"
              color={p.accentText}
              onPress={() => Linking.openURL(s.linkUrl!)}
            >
              {s.linkUrl}
            </T>
          )}
          {s.fileName && (
            <T v="small" color={p.muted}>
              📎 {s.fileName}
            </T>
          )}
          {s.feedback && (
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: p.sunken,
                gap: 4,
              }}
            >
              <T v="overline">Feedback</T>
              <T>{s.feedback}</T>
            </View>
          )}
        </Card>
      )}
      {canSubmit && (
        <Card style={{ gap: 12 }}>
          <T v="h3">{s ? 'Resubmit' : 'Submit your work'}</T>
          <Field
            label="Answer"
            multiline
            value={body}
            onChangeText={setBody}
            placeholder="Describe what you did, or paste your answer"
          />
          <Field
            label="Link (optional)"
            icon="link"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
          />
          <T v="small" color={p.muted}>
            Need to attach a file? Submit from the web app.
          </T>
          <Button
            title="Submit"
            icon="send"
            loading={submit.isPending}
            disabled={!body.trim() && !link.trim()}
            onPress={() => submit.mutate()}
          />
        </Card>
      )}
    </View>
  );
}
