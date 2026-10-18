import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  FadeIn,
  IconTile,
  Loading,
  ProgressBar,
  Screen,
  SectionHeader,
  StatCard,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { relative } from '../../lib/format';
import { useSession } from '../../lib/session';
import type { InstructorOverview } from '../../lib/types';
import type { TabScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function TeachHomeScreen({ navigation }: TabScreen<'TeachHome'>) {
  const p = usePalette();
  const { user } = useSession();
  const o = useQuery({
    queryKey: ['instructor-overview'],
    queryFn: () =>
      api.get<InstructorOverview>('/instructor/analytics/overview'),
  });
  if (o.error)
    return (
      <Screen>
        <ErrorState message={errorMessage(o.error)} onRetry={o.refetch} />
      </Screen>
    );
  if (!o.data) return <Loading />;
  const d = o.data;
  return (
    <Screen refreshing={o.isRefetching} onRefresh={o.refetch}>
      <FadeIn style={{ gap: 2 }}>
        <T v="overline">Instructor</T>
        <T v="h1">Your teaching week</T>
        <T color={p.muted}>Welcome back, {user?.fullName.split(' ')[0]}.</T>
      </FadeIn>
      <FadeIn
        delay={60}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
      >
        <StatCard
          label="Active learners"
          value={String(d.enrolledLearners)}
          icon="users"
          hue="orbit"
          hint={`+${d.newLearners90Days} in 90 days`}
        />
        <StatCard
          label="Avg. completion"
          value={`${Math.round(d.averageCompletionPercent)}%`}
          icon="target"
          hue="green"
        />
        <StatCard
          label="To grade"
          value={String(d.toGrade)}
          icon="clipboard-check"
          hue="coral"
          hint={
            d.oldestUngradedAt
              ? `Oldest ${relative(d.oldestUngradedAt)}`
              : 'All caught up'
          }
        />
        <StatCard
          label="Rating"
          value={d.reviewCount ? d.rating.toFixed(1) : '—'}
          icon="star"
          hue="amber"
          hint={`${d.reviewCount} reviews`}
        />
      </FadeIn>
      {d.toGrade > 0 && (
        <Button
          title={`Grade ${d.toGrade} submission${d.toGrade === 1 ? '' : 's'}`}
          icon="clipboard-check"
          onPress={() => navigation.navigate('Grading')}
        />
      )}

      <FadeIn delay={120} style={{ gap: 10 }}>
        <SectionHeader
          title="Courses I teach"
          action="All"
          onAction={() => navigation.navigate('TeachCourses')}
        />
        {d.courses.map(c => (
          <Card
            key={c.courseId}
            onPress={() =>
              navigation.navigate('Roster', {
                courseId: c.courseId,
                title: c.title,
              })
            }
            style={{ gap: 10 }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <IconTile icon={c.icon} hue={c.hue} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3" numberOfLines={1}>
                  {c.title}
                </T>
                <T v="small" color={p.muted}>
                  {c.learners} learners
                  {c.ratingCount ? ` · ★ ${c.rating.toFixed(1)}` : ''}
                </T>
              </View>
              <Badge
                label={
                  c.status === 'PUBLISHED'
                    ? 'Live'
                    : c.status === 'DRAFT'
                    ? 'Draft'
                    : 'Archived'
                }
                tone={c.status === 'PUBLISHED' ? 'success' : 'neutral'}
              />
            </View>
            <ProgressBar value={c.averageProgressPercent} color={p.orbit} />
            <T v="small" color={p.muted}>
              Average progress {Math.round(c.averageProgressPercent)}%
            </T>
          </Card>
        ))}
      </FadeIn>

      {d.atRisk.length > 0 && (
        <FadeIn delay={180} style={{ gap: 10 }}>
          <SectionHeader title="Learners who may need help" />
          <Card padding={4}>
            {d.atRisk.slice(0, 6).map((l, i, a) => (
              <View
                key={l.userId + l.courseId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderBottomWidth: i === a.length - 1 ? 0 : 0.5,
                  borderBottomColor: p.border,
                }}
              >
                <Avatar name={l.fullName} uri={l.avatarUrl} size={34} />
                <View style={{ flex: 1 }}>
                  <T v="label">{l.fullName}</T>
                  <T v="small" color={p.muted} numberOfLines={1}>
                    {l.courseTitle} · idle {relative(l.lastActiveAt)}
                  </T>
                </View>
                <Badge label={`${l.progressPercent}%`} tone="warning" />
              </View>
            ))}
          </Card>
        </FadeIn>
      )}
    </Screen>
  );
}
