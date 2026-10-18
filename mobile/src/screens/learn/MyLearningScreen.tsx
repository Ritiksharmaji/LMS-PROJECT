import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  CourseCard,
  EmptyState,
  ErrorState,
  FadeIn,
  Loading,
  Screen,
  Segmented,
  T,
} from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useEnrollments } from '../../lib/queries';
import type { TabScreen } from '../../navigation/types';

export function MyLearningScreen({ navigation }: TabScreen<'MyLearning'>) {
  const [tab, setTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const e = useEnrollments();
  const list = (e.data ?? []).filter(x => x.status === tab);
  return (
    <Screen refreshing={e.isRefetching} onRefresh={e.refetch}>
      <T v="h1">My learning</T>
      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { value: 'ACTIVE', label: 'In progress' },
          { value: 'COMPLETED', label: 'Completed' },
        ]}
      />
      {e.error ? (
        <ErrorState message={errorMessage(e.error)} onRetry={e.refetch} />
      ) : !e.data ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === 'ACTIVE' ? 'book-open' : 'award'}
          title={
            tab === 'ACTIVE'
              ? 'Nothing in progress'
              : 'No completed courses yet'
          }
          message={
            tab === 'ACTIVE'
              ? 'Enroll in a course to see it here.'
              : 'Finish every lesson in a course to earn its certificate.'
          }
          action={
            tab === 'ACTIVE' ? (
              <Button
                title="Browse courses"
                small
                onPress={() => navigation.navigate('Explore')}
              />
            ) : undefined
          }
        />
      ) : (
        <View style={{ gap: 14 }}>
          {list.map((x, i) => (
            <FadeIn key={x.id} delay={Math.min(i, 6) * 60} style={{ gap: 8 }}>
              <CourseCard
                course={x.course}
                progress={x.progress.percent}
                badge={x.status === 'COMPLETED' ? 'Completed' : undefined}
                onPress={() =>
                  navigation.navigate('Player', {
                    courseId: x.course.id,
                    title: x.course.title,
                  })
                }
              />
              {x.certificateCode && (
                <Button
                  title="View certificate"
                  variant="secondary"
                  small
                  icon="award"
                  onPress={() =>
                    navigation.navigate('Certificate', {
                      code: x.certificateCode!,
                    })
                  }
                />
              )}
            </FadeIn>
          ))}
        </View>
      )}
    </Screen>
  );
}
