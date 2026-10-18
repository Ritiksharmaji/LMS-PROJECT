import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  View,
} from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FadeIn,
  Field,
  Loading,
  ProgressBar,
  Screen,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { dateTime, relative } from '../../lib/format';
import type { LearnerView, Page, SubmissionView } from '../../lib/types';
import type { RootScreen, TabScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function GradingScreen({ navigation }: TabScreen<'Grading'>) {
  const p = usePalette();
  const q = useQuery({
    queryKey: ['grading-queue'],
    queryFn: () => api.get<SubmissionView[]>('/instructor/grading-queue'),
  });
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <T v="h1">Grading</T>
      <T color={p.muted}>Ungraded submissions, oldest first.</T>
      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} />
      ) : !q.data ? (
        <Loading />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon="circle-check"
          title="Nothing to grade"
          message="New assignment submissions will appear here."
        />
      ) : (
        q.data.map((s, i) => (
          <FadeIn key={s.id} delay={Math.min(i, 6) * 50}>
            <Card
              onPress={() => navigation.navigate('Submission', { id: s.id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Avatar name={s.learnerName} uri={s.learnerAvatarUrl} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3" numberOfLines={1}>
                  {s.learnerName}
                </T>
                <T v="small" color={p.muted} numberOfLines={1}>
                  {s.lessonTitle} · {s.courseTitle}
                </T>
                <T v="small" color={p.subtle}>
                  {relative(s.submittedAt)}
                </T>
              </View>
              {s.late && <Badge label="Late" tone="warning" />}
            </Card>
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

export function SubmissionScreen({
  navigation,
  route,
}: RootScreen<'Submission'>) {
  const p = usePalette();
  const qc = useQueryClient();
  const s = useQuery({
    queryKey: ['submission', route.params.id],
    queryFn: () =>
      api.get<SubmissionView>(`/instructor/submissions/${route.params.id}`),
  });
  const [points, setPoints] = useState('');
  const [feedback, setFeedback] = useState('');
  const after = () => {
    qc.invalidateQueries({ queryKey: ['grading-queue'] });
    qc.invalidateQueries({ queryKey: ['instructor-overview'] });
    navigation.goBack();
  };
  const grade = useMutation({
    mutationFn: () =>
      api.put<SubmissionView>(
        `/instructor/submissions/${route.params.id}/grade`,
        { points: Number(points), feedback: feedback.trim() || undefined },
      ),
    onSuccess: after,
    onError: e => Alert.alert("Couldn't save the grade", errorMessage(e)),
  });
  const ret = useMutation({
    mutationFn: () =>
      api.post<SubmissionView>(
        `/instructor/submissions/${route.params.id}/return`,
        { feedback: feedback.trim() },
      ),
    onSuccess: after,
    onError: e => Alert.alert("Couldn't return it", errorMessage(e)),
  });
  if (s.error)
    return (
      <Screen>
        <ErrorState message={errorMessage(s.error)} onRetry={s.refetch} />
      </Screen>
    );
  if (!s.data) return <Loading />;
  const x = s.data;
  const n = Number(points);
  const valid =
    points !== '' && Number.isFinite(n) && n >= 0 && n <= x.maxPoints;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Screen>
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={x.learnerName} uri={x.learnerAvatarUrl} size={44} />
            <View style={{ flex: 1 }}>
              <T v="h3">{x.learnerName}</T>
              <T v="small" color={p.muted}>
                {x.lessonTitle} · {x.courseTitle}
              </T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge label={`Submitted ${dateTime(x.submittedAt)}`} />
            {x.late && <Badge label="Late" tone="warning" />}
          </View>
        </Card>
        <Card style={{ gap: 10 }}>
          <T v="overline">Submission</T>
          {x.body ? <T>{x.body}</T> : <T color={p.muted}>No written answer.</T>}
          {x.linkUrl && (
            <T
              v="label"
              color={p.accentText}
              onPress={() => Linking.openURL(x.linkUrl!)}
            >
              {x.linkUrl}
            </T>
          )}
          {x.fileName && (
            <Button
              title={x.fileName}
              small
              variant="secondary"
              icon="file-text"
              onPress={() =>
                api
                  .get<{ url: string }>(`/me/files/${x.fileId}/download`)
                  .then(r => Linking.openURL(r.url))
                  .catch(e => Alert.alert("Couldn't open", errorMessage(e)))
              }
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </Card>
        <Card style={{ gap: 12 }}>
          <T v="h3">Grade</T>
          <Field
            label={`Points (out of ${x.maxPoints})`}
            keyboardType="number-pad"
            value={points}
            onChangeText={setPoints}
            error={points && !valid ? `Enter 0–${x.maxPoints}` : undefined}
          />
          <Field
            label="Feedback"
            multiline
            value={feedback}
            onChangeText={setFeedback}
            placeholder="What went well, and what to improve"
          />
          <Button
            title="Save grade"
            icon="check"
            loading={grade.isPending}
            disabled={!valid}
            onPress={() => grade.mutate()}
          />
          <Button
            title="Return for revision"
            variant="secondary"
            icon="refresh-cw"
            loading={ret.isPending}
            disabled={!feedback.trim()}
            onPress={() => ret.mutate()}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function RosterScreen({ route }: RootScreen<'Roster'>) {
  const p = usePalette();
  const r = useQuery({
    queryKey: ['roster', route.params.courseId],
    queryFn: () =>
      api.get<Page<LearnerView>>(
        `/instructor/courses/${route.params.courseId}/learners?size=100`,
      ),
  });
  return (
    <Screen refreshing={r.isRefetching} onRefresh={r.refetch}>
      {r.error ? (
        <ErrorState message={errorMessage(r.error)} onRetry={r.refetch} />
      ) : !r.data ? (
        <Loading />
      ) : r.data.items.length === 0 ? (
        <EmptyState
          icon="users"
          title="No learners yet"
          message="Learners appear here as they enroll."
        />
      ) : (
        <>
          <T v="small" color={p.muted}>
            {r.data.total} learners
          </T>
          {r.data.items.map((l, i) => (
            <FadeIn key={l.enrollmentId} delay={Math.min(i, 8) * 40}>
              <Card style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Avatar name={l.fullName} uri={l.avatarUrl} />
                  <View style={{ flex: 1 }}>
                    <T v="h3">{l.fullName}</T>
                    <T v="small" color={p.muted} numberOfLines={1}>
                      {l.email}
                    </T>
                  </View>
                  {l.status === 'COMPLETED' ? (
                    <Badge label="Completed" tone="success" dot />
                  ) : (
                    <T v="label">{l.progress.percent}%</T>
                  )}
                </View>
                <ProgressBar
                  value={l.progress.percent}
                  color={l.status === 'COMPLETED' ? p.success : p.accent}
                />
                <T v="small" color={p.subtle}>
                  Last active {relative(l.lastAccessedAt)}
                </T>
              </Card>
            </FadeIn>
          ))}
        </>
      )}
    </Screen>
  );
}
