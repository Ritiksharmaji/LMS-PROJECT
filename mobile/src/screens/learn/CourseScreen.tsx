import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  FadeIn,
  Loading,
  Row,
  Screen,
  Segmented,
  Stars,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import {
  count,
  duration,
  level,
  money,
  price,
  relative,
} from '../../lib/format';
import { useEnrollments } from '../../lib/queries';
import { useSession } from '../../lib/session';
import type {
  CheckoutResponse,
  CourseDetail,
  LessonKind,
  OrderView,
  Page,
  ReviewSummary,
  ReviewView,
  WishlistEntry,
} from '../../lib/types';
import type { RootScreen } from '../../navigation/types';
import { hueOf } from '../../theme/palette';
import { usePalette } from '../../theme/ThemeProvider';

export const KIND_ICON: Record<LessonKind, string> = {
  VIDEO: 'circle-play',
  READING: 'file-text',
  QUIZ: 'circle-help',
  ASSIGNMENT: 'clipboard-check',
};

export function CourseScreen({ navigation, route }: RootScreen<'Course'>) {
  const p = usePalette();
  const qc = useQueryClient();
  const { orgSlug, role } = useSession();
  const [tab, setTab] = useState<'curriculum' | 'overview' | 'reviews'>(
    'curriculum',
  );
  const detail = useQuery({
    queryKey: ['course', orgSlug, route.params.slug],
    queryFn: () =>
      api.get<CourseDetail>(
        `/public/organizations/${orgSlug}/courses/${route.params.slug}`,
      ),
  });
  const c = detail.data?.course;
  const reviews = useQuery({
    queryKey: ['reviews', c?.id],
    enabled: !!c,
    queryFn: () =>
      Promise.all([
        api.get<Page<ReviewView>>(
          `/public/organizations/${orgSlug}/courses/${c!.id}/reviews?size=10`,
        ),
        api.get<ReviewSummary>(
          `/public/organizations/${orgSlug}/courses/${c!.id}/reviews/summary`,
        ),
      ]),
  });
  const enrollments = useEnrollments();
  const wishlist = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<WishlistEntry[]>('/me/wishlist'),
  });
  const enrolled = c && enrollments.data?.some(e => e.course.id === c.id);
  const saved = c && wishlist.data?.some(w => w.course.id === c.id);
  const staff = role === 'ADMIN' || role === 'INSTRUCTOR';

  const done = () => {
    qc.invalidateQueries({ queryKey: ['enrollments'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
    navigation.replace('Player', { courseId: c!.id, title: c!.title });
  };
  const enroll = useMutation({
    mutationFn: () => api.post('/me/enrollments', { courseId: c!.id }),
    onSuccess: done,
    onError: e => Alert.alert("Couldn't enroll", errorMessage(e)),
  });
  const buy = useMutation({
    mutationFn: () =>
      api.post<CheckoutResponse>('/me/checkout', { courseId: c!.id }),
    onSuccess: r => {
      if (r.provider !== 'test') {
        Linking.openURL(r.checkoutUrl);
        return;
      }
      Alert.alert(
        'Test checkout',
        `Complete a test payment of ${money(
          c!.priceCents,
          c!.currency,
        )}? No real money moves.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay',
            onPress: () =>
              api
                .post<OrderView>(`/me/orders/${r.orderId}/test-pay`)
                .then(done)
                .catch(e => Alert.alert('Payment failed', errorMessage(e))),
          },
        ],
      );
    },
    onError: e => Alert.alert("Couldn't start checkout", errorMessage(e)),
  });
  const toggleWish = useMutation({
    mutationFn: () =>
      saved
        ? api.del(`/me/wishlist/${c!.id}`)
        : api.put(`/me/wishlist/${c!.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  if (detail.error)
    return (
      <Screen>
        <ErrorState
          message={errorMessage(detail.error)}
          onRetry={detail.refetch}
        />
      </Screen>
    );
  if (!detail.data || !c) return <Loading />;
  const d = detail.data;
  const [bg, fg] = hueOf(p, c.hue);

  return (
    <Screen padded={false}>
      <View
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {c.coverUrl ? (
          <Image
            source={{ uri: c.coverUrl }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
        ) : (
          <Icon name={c.icon} size={56} color={fg} />
        )}
      </View>
      <View style={{ padding: 16, gap: 16 }}>
        <FadeIn style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {d.category && <Badge label={d.category.name} tone="orbit" />}
            <Badge label={level(c.level)} />
            {c.featured && <Badge label="Bestseller" tone="accent" />}
          </View>
          <T v="h1">{c.title}</T>
          {c.tagline && <T color={p.muted}>{c.tagline}</T>}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
              marginTop: 2,
            }}
          >
            {c.ratingCount > 0 && (
              <Stars rating={c.ratingAvg} count={c.ratingCount} />
            )}
            <Meta icon="users" text={`${count(c.enrollmentCount)} learners`} />
            <Meta icon="clock" text={duration(c.durationMinutes)} />
            <Meta icon="book-open" text={`${c.lessonCount} lessons`} />
          </View>
          {d.instructor && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 6,
              }}
            >
              <Avatar
                name={d.instructor.fullName}
                uri={d.instructor.avatarUrl}
                size={32}
              />
              <T v="small">
                Created by <T v="label">{d.instructor.fullName}</T>
              </T>
            </View>
          )}
        </FadeIn>

        <FadeIn delay={80}>
          <Card style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <T
                v="display"
                style={{ fontSize: 26 }}
                color={c.priceCents ? p.text : p.successText}
              >
                {enrolled
                  ? 'Enrolled'
                  : staff
                  ? 'Free for staff'
                  : price(c.priceCents, c.currency)}
              </T>
              <Pressable
                onPress={() => toggleWish.mutate()}
                hitSlop={10}
                accessibilityLabel={
                  saved ? 'Remove from wishlist' : 'Save to wishlist'
                }
              >
                <Icon
                  name="heart"
                  size={26}
                  color={saved ? p.accent : p.muted}
                  weight={saved ? 'fill' : 'duotone'}
                />
              </Pressable>
            </View>
            {enrolled ? (
              <Button
                title="Go to course"
                iconRight="arrow-right"
                onPress={() =>
                  navigation.replace('Player', {
                    courseId: c.id,
                    title: c.title,
                  })
                }
              />
            ) : c.priceCents && !staff ? (
              <Button
                title={`Buy for ${money(c.priceCents, c.currency)}`}
                icon="credit-card"
                loading={buy.isPending}
                onPress={() => buy.mutate()}
              />
            ) : (
              <Button
                title="Enroll for free"
                iconRight="arrow-right"
                loading={enroll.isPending}
                onPress={() => enroll.mutate()}
              />
            )}
          </Card>
        </FadeIn>

        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { value: 'curriculum', label: 'Curriculum' },
            { value: 'overview', label: 'Overview' },
            {
              value: 'reviews',
              label: `Reviews${c.ratingCount ? ` (${c.ratingCount})` : ''}`,
            },
          ]}
        />

        {tab === 'curriculum' &&
          d.curriculum.map((s, si) => (
            <FadeIn key={s.id} delay={si * 60}>
              <Card padding={4}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    padding: 12,
                    paddingBottom: 4,
                  }}
                >
                  <T v="h3" style={{ flex: 1 }}>
                    {si + 1}. {s.title}
                  </T>
                  <T v="small" color={p.muted}>
                    {s.lessons.length} lessons
                  </T>
                </View>
                {s.lessons.map((l, li) => (
                  <View key={l.id} style={{ paddingHorizontal: 12 }}>
                    <Row
                      last={li === s.lessons.length - 1}
                      title={l.title}
                      subtitle={
                        l.kind === 'QUIZ'
                          ? 'Quick check'
                          : l.kind === 'ASSIGNMENT'
                          ? 'Graded'
                          : `${l.durationMinutes} min`
                      }
                      left={
                        <Icon
                          name={KIND_ICON[l.kind]}
                          size={20}
                          color={p.muted}
                        />
                      }
                      right={
                        l.preview ? (
                          <Badge label="Preview" tone="success" />
                        ) : (
                          <Icon name="lock" size={16} color={p.subtle} />
                        )
                      }
                    />
                  </View>
                ))}
              </Card>
            </FadeIn>
          ))}

        {tab === 'overview' && (
          <FadeIn style={{ gap: 14 }}>
            {d.outcomes.length > 0 && (
              <Card style={{ gap: 10 }}>
                <T v="h3">What you'll learn</T>
                {d.outcomes.map(o => (
                  <View key={o} style={{ flexDirection: 'row', gap: 10 }}>
                    <Icon name="circle-check" size={18} color={p.success} />
                    <T style={{ flex: 1 }}>{o}</T>
                  </View>
                ))}
              </Card>
            )}
            {d.description?.split(/\n{2,}/).map((para, i) => (
              <T key={i} style={{ lineHeight: 24 }}>
                {para}
              </T>
            ))}
          </FadeIn>
        )}

        {tab === 'reviews' && (
          <FadeIn style={{ gap: 12 }}>
            {reviews.data?.[1] && reviews.data[1].count > 0 && (
              <Card
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <T v="display">{reviews.data[1].average.toFixed(1)}</T>
                <View style={{ gap: 2 }}>
                  <Stars rating={reviews.data[1].average} />
                  <T v="small" color={p.muted}>
                    {reviews.data[1].count} reviews
                  </T>
                </View>
              </Card>
            )}
            {reviews.data?.[0].items.length ? (
              reviews.data[0].items.map(r => (
                <Card key={r.id} style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Avatar name={r.userName} uri={r.userAvatarUrl} size={32} />
                    <View style={{ flex: 1 }}>
                      <T v="label">{r.userName}</T>
                      <T v="small" color={p.muted}>
                        {r.rating}/5 · {relative(r.createdAt)}
                      </T>
                    </View>
                  </View>
                  {r.comment && <T>{r.comment}</T>}
                </Card>
              ))
            ) : (
              <T v="small" color={p.muted}>
                No reviews yet.
              </T>
            )}
          </FadeIn>
        )}
      </View>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={15} color={p.muted} />
      <T v="small" color={p.muted}>
        {text}
      </T>
    </View>
  );
}
