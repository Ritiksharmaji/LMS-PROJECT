import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Image, ScrollView, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  Badge,
  Button,
  Card,
  CourseCard,
  EmptyState,
  ErrorState,
  FadeIn,
  IconTile,
  ProgressRing,
  Row,
  Screen,
  SectionHeader,
  StatCard,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { dateTime, due, greeting } from '../../lib/format';
import { useCatalog } from '../../lib/queries';
import { useSession } from '../../lib/session';
import type { Deadline, LearningSummary, SessionView } from '../../lib/types';
import type { TabScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function LearnHomeScreen({ navigation }: TabScreen<'LearnHome'>) {
  const p = usePalette();
  const { user } = useSession();
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.get<LearningSummary>('/me/learning/summary'),
  });
  const deadlines = useQuery({
    queryKey: ['deadlines'],
    queryFn: () => api.get<Deadline[]>('/me/deadlines'),
  });
  const sessions = useQuery({
    queryKey: ['schedule', 'me'],
    queryFn: () => api.get<SessionView[]>('/me/schedule'),
  });
  const picks = useCatalog({ size: 8 });
  const s = summary.data;
  const current = s?.continueLearning[0];
  const refresh = () =>
    Promise.all([
      summary.refetch(),
      deadlines.refetch(),
      sessions.refetch(),
      picks.refetch(),
    ]);

  return (
    <Screen refreshing={summary.isRefetching} onRefresh={refresh}>
      <FadeIn style={{ gap: 2 }}>
        <T v="overline">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </T>
        <T v="h1">
          {greeting()}, {user?.fullName.split(' ')[0]}
        </T>
      </FadeIn>
      {summary.error && (
        <ErrorState
          message={errorMessage(summary.error)}
          onRetry={summary.refetch}
        />
      )}

      {current ? (
        <FadeIn delay={60}>
          <Card
            padding={0}
            onPress={() =>
              navigation.navigate('Player', {
                courseId: current.course.id,
                title: current.course.title,
              })
            }
            style={{
              backgroundColor: p.night,
              borderColor: p.night,
              overflow: 'hidden',
            }}
          >
            {current.course.coverUrl && (
              <Image
                source={{ uri: current.course.coverUrl }}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: '55%',
                  opacity: 0.3,
                }}
              />
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                padding: 18,
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Badge label="Continue learning" tone="accent" />
                <T v="h2" color="#fff" numberOfLines={2}>
                  {current.course.title}
                </T>
                <T v="small" color={p.nightText}>
                  {current.progress.completedLessons} of{' '}
                  {current.progress.totalLessons} lessons done
                </T>
                <Button
                  title="Resume"
                  icon="play"
                  small
                  onPress={() =>
                    navigation.navigate('Player', {
                      courseId: current.course.id,
                      title: current.course.title,
                    })
                  }
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                />
              </View>
              <ProgressRing
                value={current.progress.percent}
                size={78}
                stroke={8}
                track="rgba(255,255,255,.14)"
              >
                <T v="h3" color="#fff">
                  {current.progress.percent}%
                </T>
              </ProgressRing>
            </View>
          </Card>
        </FadeIn>
      ) : (
        s && (
          <EmptyState
            icon="compass"
            title="All caught up"
            message="Pick your next course from the catalog."
            action={
              <Button
                title="Browse courses"
                small
                onPress={() => navigation.navigate('Explore')}
              />
            }
          />
        )
      )}

      {s && (
        <FadeIn
          delay={120}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
        >
          <StatCard
            label="In progress"
            value={String(s.inProgress)}
            icon="book-open"
            hue="coral"
            hint={`${s.completed} completed`}
          />
          <StatCard
            label="This week"
            value={String(s.lessonsThisWeek)}
            icon="flame"
            hue="amber"
            hint={`${Math.round(s.minutesLearned / 60)}h learned`}
          />
        </FadeIn>
      )}

      <FadeIn delay={180} style={{ gap: 10 }}>
        <SectionHeader title="Upcoming deadlines" />
        <Card padding={4}>
          {deadlines.data?.length ? (
            deadlines.data.slice(0, 5).map((d, i, a) => {
              const b = due(d.dueAt);
              return (
                <View key={d.lessonId} style={{ paddingHorizontal: 12 }}>
                  <Row
                    last={i === a.length - 1}
                    title={d.title ?? 'Untitled'}
                    subtitle={d.courseTitle}
                    left={
                      <IconTile
                        icon={d.kind === 'QUIZ' ? 'circle-help' : 'file-text'}
                        hue={d.courseHue}
                        size={36}
                      />
                    }
                    right={<Badge label={b.label} tone={b.tone} />}
                    onPress={() =>
                      navigation.navigate('Lesson', {
                        lessonId: d.lessonId,
                        courseId: d.courseId,
                      })
                    }
                  />
                </View>
              );
            })
          ) : (
            <T v="small" color={p.muted} style={{ padding: 12 }}>
              No deadlines coming up.
            </T>
          )}
        </Card>
      </FadeIn>

      {!!sessions.data?.length && (
        <FadeIn delay={220} style={{ gap: 10 }}>
          <SectionHeader
            title="Live sessions"
            action="Schedule"
            onAction={() => navigation.navigate('Schedule')}
          />
          {sessions.data.slice(0, 2).map(x => (
            <Card
              key={x.id}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
            >
              <IconTile icon="video" hue={x.courseHue} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">{x.title}</T>
                <T v="small" color={p.muted}>
                  {dateTime(x.startsAt)} · {x.courseTitle}
                </T>
              </View>
            </Card>
          ))}
        </FadeIn>
      )}

      {!!picks.data?.items.length && (
        <FadeIn delay={260} style={{ gap: 10 }}>
          <SectionHeader
            title="Popular right now"
            action="See all"
            onAction={() => navigation.navigate('Explore')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{
              gap: 12,
              paddingHorizontal: 16,
              paddingBottom: 6,
            }}
          >
            {picks.data.items.map(c => (
              <CourseCard
                key={c.id}
                course={c}
                wide
                onPress={() =>
                  navigation.navigate('Course', {
                    slug: c.slug,
                    title: c.title,
                  })
                }
              />
            ))}
          </ScrollView>
        </FadeIn>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card
          onPress={() => navigation.navigate('Grades')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <IconTile icon="award" hue="green" size={34} />
          <T v="label">Grades</T>
        </Card>
        <Card
          onPress={() => navigation.navigate('Wishlist')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <IconTile icon="heart" hue="coral" size={34} />
          <T v="label">Wishlist</T>
          <View style={{ flex: 1 }} />
          <Icon name="chevron-right" size={14} color={p.subtle} />
        </Card>
      </View>
    </Screen>
  );
}
