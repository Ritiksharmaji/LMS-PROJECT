import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, Share, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { WEB_URL } from '../../config';
import {
  Badge,
  Button,
  Card,
  CourseCard,
  EmptyState,
  ErrorState,
  FadeIn,
  IconTile,
  Loading,
  Logo,
  Row,
  Screen,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, money, relative } from '../../lib/format';
import type {
  CertificateView,
  MyGrade,
  NotificationView,
  OrderStatus,
  OrderView,
  Page,
  WishlistEntry,
} from '../../lib/types';
import type { RootScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

const NOTE_ICON: Record<string, [string, string]> = {
  GRADED: ['award', 'green'],
  RETURNED: ['refresh-cw', 'amber'],
  REPLY: ['message-square', 'orbit'],
  THREAD: ['message-square', 'orbit'],
  SESSION: ['calendar', 'sky'],
  ORDER: ['receipt', 'sky'],
  COMPLETED: ['award', 'green'],
  DUE: ['clock', 'amber'],
  ASSIGNED: ['book-open', 'coral'],
  SUBMITTED: ['file-text', 'coral'],
};
const noteIcon = (kind: string) =>
  Object.entries(NOTE_ICON).find(([k]) =>
    kind.toUpperCase().includes(k),
  )?.[1] ?? ['bell', 'coral'];

export function NotificationsScreen() {
  const p = usePalette();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.get<Page<NotificationView>>('/me/notifications?size=50'),
  });
  const done = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readAll = useMutation({
    mutationFn: () => api.post('/me/notifications/read-all'),
    onSuccess: done,
  });
  const readOne = useMutation({
    mutationFn: (id: string) => api.post(`/me/notifications/${id}/read`),
    onSuccess: done,
  });
  const unread = list.data?.items.filter(n => !n.read).length ?? 0;
  return (
    <Screen refreshing={list.isRefetching} onRefresh={list.refetch}>
      {unread > 0 && (
        <Button
          title={`Mark all ${unread} as read`}
          small
          variant="secondary"
          icon="check"
          onPress={() => readAll.mutate()}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
      {list.error ? (
        <ErrorState message={errorMessage(list.error)} onRetry={list.refetch} />
      ) : !list.data ? (
        <Loading />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="You're all caught up"
          message="Grades, replies and session updates will show up here."
        />
      ) : (
        <Card padding={4}>
          {list.data.items.map((n, i, a) => {
            const [icon, hue] = noteIcon(n.kind);
            return (
              <View key={n.id} style={{ paddingHorizontal: 12 }}>
                <Row
                  last={i === a.length - 1}
                  title={n.title}
                  subtitle={`${n.body ? n.body + ' · ' : ''}${relative(
                    n.createdAt,
                  )}`}
                  left={<IconTile icon={icon} hue={hue} size={36} />}
                  right={
                    !n.read ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: p.accent,
                        }}
                      />
                    ) : (
                      <View />
                    )
                  }
                  onPress={!n.read ? () => readOne.mutate(n.id) : undefined}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

export function GradesScreen({ navigation }: RootScreen<'Grades'>) {
  const p = usePalette();
  const g = useQuery({
    queryKey: ['grades'],
    queryFn: () => api.get<MyGrade[]>('/me/grades'),
  });
  return (
    <Screen refreshing={g.isRefetching} onRefresh={g.refetch}>
      {g.error ? (
        <ErrorState message={errorMessage(g.error)} onRetry={g.refetch} />
      ) : !g.data ? (
        <Loading />
      ) : g.data.length === 0 ? (
        <EmptyState
          icon="award"
          title="No grades yet"
          message="Quiz results and assignment grades appear here."
        />
      ) : (
        g.data.map((x, i) => (
          <FadeIn key={x.lessonId} delay={Math.min(i, 6) * 50}>
            <Card
              onPress={() =>
                navigation.navigate('Lesson', {
                  lessonId: x.lessonId,
                  courseId: x.courseId,
                })
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <IconTile
                icon={x.kind === 'QUIZ' ? 'circle-help' : 'clipboard-check'}
                hue={x.kind === 'QUIZ' ? 'orbit' : 'coral'}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3" numberOfLines={1}>
                  {x.title}
                </T>
                <T v="small" color={p.muted} numberOfLines={1}>
                  {x.courseTitle} · {date(x.at)}
                </T>
              </View>
              {x.percent != null ? (
                <T
                  v="h2"
                  color={x.percent >= 70 ? p.successText : p.warningText}
                >
                  {Math.round(x.percent)}%
                </T>
              ) : (
                <Badge
                  label={x.status === 'SUBMITTED' ? 'Awaiting grade' : x.status}
                  tone="info"
                />
              )}
            </Card>
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

export function WishlistScreen({ navigation }: RootScreen<'Wishlist'>) {
  const w = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<WishlistEntry[]>('/me/wishlist'),
  });
  return (
    <Screen refreshing={w.isRefetching} onRefresh={w.refetch}>
      {w.error ? (
        <ErrorState message={errorMessage(w.error)} onRetry={w.refetch} />
      ) : !w.data ? (
        <Loading />
      ) : w.data.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          message="Tap the heart on a course to save it for later."
        />
      ) : (
        w.data.map((x, i) => (
          <FadeIn key={x.course.id} delay={Math.min(i, 6) * 50}>
            <CourseCard
              course={x.course}
              onPress={() =>
                navigation.navigate('Course', {
                  slug: x.course.slug,
                  title: x.course.title,
                })
              }
            />
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

export const ORDER_TONE: Record<
  OrderStatus,
  'success' | 'warning' | 'danger' | 'neutral' | 'info'
> = {
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'info',
};

export function OrdersScreen() {
  const p = usePalette();
  const qc = useQueryClient();
  const o = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<OrderView[]>('/me/orders'),
  });
  const refund = useMutation({
    mutationFn: (id: string) => api.post<OrderView>(`/me/orders/${id}/refund`),
    onSuccess: () => {
      o.refetch();
      qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: e => Alert.alert("Couldn't refund", errorMessage(e)),
  });
  return (
    <Screen refreshing={o.isRefetching} onRefresh={o.refetch}>
      {o.error ? (
        <ErrorState message={errorMessage(o.error)} onRetry={o.refetch} />
      ) : !o.data ? (
        <Loading />
      ) : o.data.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No orders yet"
          message="Paid courses you buy show up here, with refunds for 30 days."
        />
      ) : (
        o.data.map(x => (
          <Card key={x.id} style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <T v="h3" style={{ flex: 1 }} numberOfLines={1}>
                {x.courseTitle}
              </T>
              <T v="h3">{money(x.amountCents, x.currency)}</T>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Badge
                label={x.status.charAt(0) + x.status.slice(1).toLowerCase()}
                tone={ORDER_TONE[x.status]}
              />
              <T v="small" color={p.muted}>
                {date(x.paidAt ?? x.createdAt)}
              </T>
            </View>
            {x.refundable && (
              <Button
                title="Request refund"
                small
                variant="secondary"
                onPress={() =>
                  Alert.alert(
                    'Refund this order?',
                    'You will lose access to the course.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Refund',
                        style: 'destructive',
                        onPress: () => refund.mutate(x.id),
                      },
                    ],
                  )
                }
                style={{ alignSelf: 'flex-start' }}
              />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

export function CertificateScreen({ route }: RootScreen<'Certificate'>) {
  const p = usePalette();
  const c = useQuery({
    queryKey: ['certificate', route.params.code],
    queryFn: () =>
      api.get<CertificateView>(`/public/certificates/${route.params.code}`),
  });
  if (c.error)
    return (
      <Screen>
        <ErrorState message={errorMessage(c.error)} onRetry={c.refetch} />
      </Screen>
    );
  if (!c.data) return <Loading />;
  const x = c.data;
  return (
    <Screen>
      <FadeIn>
        <Card
          style={{
            alignItems: 'center',
            gap: 10,
            paddingVertical: 32,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: 130,
              borderWidth: 1.5,
              borderColor: p.orbitSoft,
              top: -130,
              right: -90,
            }}
          />
          <Badge label="Verified certificate" tone="success" dot />
          <T v="overline" style={{ marginTop: 14 }}>
            Certificate of completion
          </T>
          <T v="display" style={{ textAlign: 'center' }}>
            {x.learnerName}
          </T>
          <T color={p.muted}>has successfully completed</T>
          <T v="h2" style={{ textAlign: 'center' }}>
            {x.courseTitle}
          </T>
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
            <Info k="Issued by" v={x.organizationName} />
            <Info k="Completed" v={date(x.completedAt)} />
          </View>
          <Info k="Credential ID" v={x.code} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
            }}
          >
            <Icon name="award" size={18} color={p.accent} />
            <Logo size={16} />
          </View>
        </Card>
      </FadeIn>
      <Button
        title="Share"
        icon="send"
        onPress={() =>
          Share.share({
            message: `I completed ${x.courseTitle} on Orbitly. Credential ID ${x.code}.\n${WEB_URL}/certificates/${x.code}`,
          })
        }
      />
    </Screen>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center' }}>
      <T v="small" color={p.subtle}>
        {k}
      </T>
      <T v="label">{v}</T>
    </View>
  );
}
