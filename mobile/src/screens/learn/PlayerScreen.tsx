import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FadeIn,
  Loading,
  ProgressRing,
  Row,
  Screen,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { PlayerView } from '../../lib/types';
import type { RootScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';
import { KIND_ICON } from './CourseScreen';

export function PlayerScreen({ navigation, route }: RootScreen<'Player'>) {
  const p = usePalette();
  const { courseId } = route.params;
  const player = useQuery({
    queryKey: ['player', courseId],
    queryFn: () => api.get<PlayerView>(`/me/courses/${courseId}/player`),
  });
  useFocusEffect(
    useCallback(() => {
      player.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  if (player.error)
    return (
      <Screen>
        <ErrorState
          message={errorMessage(player.error)}
          onRetry={player.refetch}
        />
      </Screen>
    );
  if (!player.data) return <Loading />;
  const d = player.data;
  const first = d.sections[0]?.lessons[0]?.id;
  const resume = d.resumeLessonId ?? first;
  const open = (lessonId: string) =>
    navigation.navigate('Lesson', { lessonId, courseId });

  return (
    <Screen refreshing={player.isRefetching} onRefresh={player.refetch}>
      <FadeIn>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ProgressRing value={d.progress.percent} size={84} stroke={8} />
          <View style={{ flex: 1, gap: 6 }}>
            <T v="h2" numberOfLines={2}>
              {d.course.title}
            </T>
            <T v="small" color={p.muted}>
              {d.progress.completedLessons} of {d.progress.totalLessons} lessons
              complete
            </T>
            {d.staffPreview && <Badge label="Staff preview" tone="orbit" />}
            {d.status === 'COMPLETED' && (
              <Badge label="Completed" tone="success" dot />
            )}
          </View>
        </Card>
      </FadeIn>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {resume && (
          <Button
            title={d.progress.completedLessons ? 'Resume' : 'Start course'}
            icon="play"
            onPress={() => open(resume)}
            style={{ flex: 1 }}
          />
        )}
        <Button
          title="Discussion"
          variant="secondary"
          icon="message-square"
          onPress={() =>
            navigation.navigate('Discussion', {
              courseId,
              title: d.course.title,
            })
          }
        />
      </View>
      {d.certificateCode && (
        <Card
          onPress={() =>
            navigation.navigate('Certificate', { code: d.certificateCode! })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: p.successSoft,
            borderColor: p.successSoft,
          }}
        >
          <Icon name="award" size={26} color={p.successText} />
          <View style={{ flex: 1 }}>
            <T v="h3" color={p.successText}>
              You earned a certificate
            </T>
            <T v="small" color={p.successText}>
              Tap to view and share it.
            </T>
          </View>
          <Icon name="chevron-right" size={16} color={p.successText} />
        </Card>
      )}
      {d.sections.map((s, si) => (
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
                {s.lessons.filter(l => l.completed).length}/{s.lessons.length}
              </T>
            </View>
            {s.lessons.map((l, li) => (
              <View key={l.id} style={{ paddingHorizontal: 12 }}>
                <Row
                  last={li === s.lessons.length - 1}
                  title={l.title}
                  subtitle={
                    l.kind === 'QUIZ'
                      ? 'Quiz'
                      : l.kind === 'ASSIGNMENT'
                      ? 'Assignment'
                      : `${l.kind === 'VIDEO' ? 'Video' : 'Reading'} · ${
                          l.durationMinutes
                        } min`
                  }
                  left={
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: l.completed
                          ? p.success
                          : l.id === d.resumeLessonId
                          ? p.accentTint
                          : p.sunken,
                      }}
                    >
                      <Icon
                        name={l.completed ? 'check' : KIND_ICON[l.kind]}
                        size={16}
                        color={
                          l.completed
                            ? '#fff'
                            : l.id === d.resumeLessonId
                            ? p.accentText
                            : p.muted
                        }
                        weight={l.completed ? 'bold' : undefined}
                      />
                    </View>
                  }
                  onPress={() => open(l.id)}
                />
              </View>
            ))}
          </Card>
        </FadeIn>
      ))}
    </Screen>
  );
}
