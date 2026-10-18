import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FadeIn,
  IconTile,
  Loading,
  Screen,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { duration } from '../../lib/format';
import { useSession } from '../../lib/session';
import type { CourseCard } from '../../lib/types';
import type { TabScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

/** Courses I teach (admins: every course). Building and editing stays on the web app. */
export function TeachCoursesScreen({ navigation }: TabScreen<'TeachCourses'>) {
  const p = usePalette();
  const { role } = useSession();
  const courses = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => api.get<CourseCard[]>('/instructor/courses'),
  });
  return (
    <Screen refreshing={courses.isRefetching} onRefresh={courses.refetch}>
      <T v="h1">{role === 'ADMIN' ? 'Course catalog' : 'My courses'}</T>
      <T color={p.muted}>
        Track learners and preview lessons here. Create and edit courses in the
        web app.
      </T>
      {courses.error ? (
        <ErrorState
          message={errorMessage(courses.error)}
          onRetry={courses.refetch}
        />
      ) : !courses.data ? (
        <Loading />
      ) : courses.data.length === 0 ? (
        <EmptyState
          icon="library"
          title="No courses yet"
          message="Courses you create on the web app appear here."
        />
      ) : (
        courses.data.map((c, i) => (
          <FadeIn key={c.id} delay={Math.min(i, 6) * 50}>
            <Card style={{ gap: 12 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <IconTile icon={c.icon} hue={c.hue} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="h3" numberOfLines={2}>
                    {c.title}
                  </T>
                  <T v="small" color={p.muted}>
                    {c.lessonCount} lessons · {duration(c.durationMinutes)} ·{' '}
                    {c.enrollmentCount} learners
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
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  title="Learners"
                  small
                  variant="secondary"
                  icon="users"
                  onPress={() =>
                    navigation.navigate('Roster', {
                      courseId: c.id,
                      title: c.title,
                    })
                  }
                  style={{ flex: 1 }}
                />
                <Button
                  title="Preview"
                  small
                  variant="secondary"
                  icon="eye"
                  onPress={() =>
                    navigation.navigate('Player', {
                      courseId: c.id,
                      title: c.title,
                    })
                  }
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </FadeIn>
        ))
      )}
    </Screen>
  );
}
