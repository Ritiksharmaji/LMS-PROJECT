import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Chips,
  CourseCard,
  EmptyState,
  ErrorState,
  FadeIn,
  Field,
  Loading,
  Screen,
  T,
} from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useCatalog, useCategories } from '../../lib/queries';
import type { TabScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function ExploreScreen({ navigation, route }: TabScreen<'Explore'>) {
  const p = usePalette();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(route.params?.category ?? '');
  const categories = useCategories();
  const courses = useCatalog({
    category: category || undefined,
    q: query || undefined,
  });
  return (
    <Screen refreshing={courses.isRefetching} onRefresh={courses.refetch}>
      <T v="h1">Explore courses</T>
      <Field
        icon="search"
        placeholder="Try “Python”, “UX research” or “SQL”"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => setQuery(q.trim())}
        returnKeyType="search"
        autoCorrect={false}
      />
      <Chips
        value={category}
        onChange={setCategory}
        items={[
          { value: '', label: 'All' },
          ...(categories.data ?? [])
            .filter(c => c.courseCount > 0)
            .map(c => ({ value: c.slug, label: c.name })),
        ]}
      />
      {courses.error ? (
        <ErrorState
          message={errorMessage(courses.error)}
          onRetry={courses.refetch}
        />
      ) : !courses.data ? (
        <Loading />
      ) : courses.data.items.length === 0 ? (
        <EmptyState
          icon="search"
          title="No courses match"
          message="Try a different search or category."
        />
      ) : (
        <View style={{ gap: 14 }}>
          <T v="small" color={p.muted}>
            {courses.data.total}{' '}
            {courses.data.total === 1 ? 'course' : 'courses'}
          </T>
          {courses.data.items.map((c, i) => (
            <FadeIn key={c.id} delay={Math.min(i, 6) * 60}>
              <CourseCard
                course={c}
                onPress={() =>
                  navigation.navigate('Course', {
                    slug: c.slug,
                    title: c.title,
                  })
                }
              />
            </FadeIn>
          ))}
        </View>
      )}
    </Screen>
  );
}
