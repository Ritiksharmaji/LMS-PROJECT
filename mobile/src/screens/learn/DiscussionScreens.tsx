import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { Icon } from '../../components/Icon';
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
  Screen,
  Segmented,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { relative } from '../../lib/format';
import { useSession } from '../../lib/session';
import type {
  Page,
  ReplyView,
  ThreadDetail,
  ThreadSummary,
} from '../../lib/types';
import type { RootScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function DiscussionScreen({
  navigation,
  route,
}: RootScreen<'Discussion'>) {
  const p = usePalette();
  const { courseId } = route.params;
  const [filter, setFilter] = useState<'all' | 'open'>('all');
  const threads = useQuery({
    queryKey: ['threads', courseId, filter],
    queryFn: () =>
      api.get<Page<ThreadSummary>>(
        `/me/courses/${courseId}/threads?size=30${
          filter === 'open' ? '&unresolved=true' : ''
        }`,
      ),
  });
  return (
    <Screen refreshing={threads.isRefetching} onRefresh={threads.refetch}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <T v="h1">Discussion</T>
        <Button
          title="Ask"
          small
          icon="plus"
          onPress={() => navigation.navigate('NewThread', { courseId })}
        />
      </View>
      <Segmented
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Unanswered' },
        ]}
      />
      {threads.error ? (
        <ErrorState
          message={errorMessage(threads.error)}
          onRetry={threads.refetch}
        />
      ) : !threads.data ? (
        <Loading />
      ) : threads.data.items.length === 0 ? (
        <EmptyState
          icon="message-square"
          title="No questions yet"
          message="Ask the first one — your instructor and classmates can answer."
        />
      ) : (
        threads.data.items.map((t, i) => (
          <FadeIn key={t.id} delay={Math.min(i, 6) * 50}>
            <Card
              onPress={() => navigation.navigate('Thread', { threadId: t.id })}
              style={{ gap: 8 }}
            >
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {t.pinned && <Badge label="Pinned" tone="orbit" />}
                {t.resolved ? (
                  <Badge label="Answered" tone="success" dot />
                ) : (
                  <Badge label="Open" />
                )}
              </View>
              <T v="h3" numberOfLines={2}>
                {t.title ?? t.body}
              </T>
              {t.title && (
                <T v="small" color={p.muted} numberOfLines={2}>
                  {t.body}
                </T>
              )}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Avatar
                  name={t.author?.fullName}
                  uri={t.author?.avatarUrl}
                  size={22}
                />
                <T v="small" color={p.muted} style={{ flex: 1 }}>
                  {t.author?.fullName} · {relative(t.lastActivityAt)}
                </T>
                <Icon name="message-square" size={14} color={p.muted} />
                <T v="small" color={p.muted}>
                  {t.replyCount}
                </T>
              </View>
            </Card>
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

export function ThreadScreen({ route }: RootScreen<'Thread'>) {
  const p = usePalette();
  const qc = useQueryClient();
  const { user } = useSession();
  const { threadId } = route.params;
  const [reply, setReply] = useState('');
  const t = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api.get<ThreadDetail>(`/me/threads/${threadId}`),
  });
  const refresh = () => {
    t.refetch();
    qc.invalidateQueries({ queryKey: ['threads'] });
  };
  const send = useMutation({
    mutationFn: () =>
      api.post<ReplyView>(`/me/threads/${threadId}/replies`, {
        body: reply.trim(),
      }),
    onSuccess: () => {
      setReply('');
      refresh();
    },
    onError: e => Alert.alert("Couldn't reply", errorMessage(e)),
  });
  const answer = useMutation({
    mutationFn: (r: ReplyView) =>
      r.answer
        ? api.del(`/me/replies/${r.id}/answer`)
        : api.put(`/me/replies/${r.id}/answer`),
    onSuccess: refresh,
    onError: e => Alert.alert("Couldn't update", errorMessage(e)),
  });
  if (t.error)
    return (
      <Screen>
        <ErrorState message={errorMessage(t.error)} onRetry={t.refetch} />
      </Screen>
    );
  if (!t.data) return <Loading />;
  const { thread, replies } = t.data;
  const mine = thread.author?.id === user?.id;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Screen refreshing={t.isRefetching} onRefresh={t.refetch}>
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar
              name={thread.author?.fullName}
              uri={thread.author?.avatarUrl}
            />
            <View style={{ flex: 1 }}>
              <T v="label">{thread.author?.fullName}</T>
              <T v="small" color={p.muted}>
                {relative(thread.createdAt)}
              </T>
            </View>
            {thread.resolved && <Badge label="Answered" tone="success" dot />}
          </View>
          {thread.title && <T v="h2">{thread.title}</T>}
          <T>{thread.body}</T>
        </Card>
        <T v="overline">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </T>
        {replies.map(r => (
          <FadeIn key={r.id}>
            <Card
              style={[
                { gap: 8 },
                r.answer && { borderColor: p.success, borderWidth: 1.5 },
              ]}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Avatar
                  name={r.author?.fullName}
                  uri={r.author?.avatarUrl}
                  size={30}
                />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <T v="label">{r.author?.fullName}</T>
                    {r.author?.staff && <Badge label="Staff" tone="orbit" />}
                  </View>
                  <T v="small" color={p.muted}>
                    {relative(r.createdAt)}
                  </T>
                </View>
                {r.answer && <Badge label="Answer" tone="success" />}
              </View>
              <T>{r.deleted ? 'This reply was removed.' : r.body}</T>
              {mine && !r.deleted && (
                <Button
                  title={r.answer ? 'Unmark answer' : 'Mark as answer'}
                  small
                  variant="ghost"
                  icon="circle-check"
                  onPress={() => answer.mutate(r)}
                  style={{ alignSelf: 'flex-start' }}
                />
              )}
            </Card>
          </FadeIn>
        ))}
        <Card style={{ gap: 10 }}>
          <Field
            multiline
            value={reply}
            onChangeText={setReply}
            placeholder="Write a reply…"
          />
          <Button
            title="Reply"
            icon="send"
            small
            loading={send.isPending}
            disabled={!reply.trim()}
            onPress={() => send.mutate()}
            style={{ alignSelf: 'flex-end' }}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function NewThreadScreen({
  navigation,
  route,
}: RootScreen<'NewThread'>) {
  const p = usePalette();
  const qc = useQueryClient();
  const { courseId, lessonId } = route.params;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const post = useMutation({
    mutationFn: () =>
      api.post<ThreadDetail>(`/me/courses/${courseId}/threads`, {
        title: title.trim() || undefined,
        body: body.trim(),
        lessonId,
      }),
    onSuccess: d => {
      qc.invalidateQueries({ queryKey: ['threads', courseId] });
      navigation.replace('Thread', { threadId: d.thread.id });
    },
    onError: e => Alert.alert("Couldn't post", errorMessage(e)),
  });
  return (
    <Screen>
      <T color={p.muted}>
        Your instructor and classmates will see this
        {lessonId ? ', linked to this lesson' : ''}.
      </T>
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Why do we scale features?"
      />
      <Field
        label="Question"
        multiline
        value={body}
        onChangeText={setBody}
        placeholder="Add the details"
      />
      <Button
        title="Post question"
        icon="send"
        loading={post.isPending}
        disabled={!body.trim()}
        onPress={() => post.mutate()}
      />
    </Screen>
  );
}
