import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Linking, View } from 'react-native';

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
import { time } from '../../lib/format';
import { useSession } from '../../lib/session';
import type { SessionKind, SessionView } from '../../lib/types';
import { usePalette } from '../../theme/ThemeProvider';

const KIND: Record<SessionKind, string> = {
  LIVE_CLASS: 'Live class',
  OFFICE_HOURS: 'Office hours',
  STUDY_GROUP: 'Study group',
  WORKSHOP: 'Workshop',
};

/** Next two weeks of live sessions; in the Teach area, the sessions you manage. */
export function ScheduleScreen() {
  const p = usePalette();
  const { area } = useSession();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 14 * 864e5);
  const range = `from=${from.toISOString()}&to=${to.toISOString()}`;
  const path =
    area === 'learn'
      ? `/me/schedule?${range}`
      : `/instructor/sessions?${range}`;
  const s = useQuery({
    queryKey: ['schedule', area, from.toDateString()],
    queryFn: () => api.get<SessionView[]>(path),
  });
  const days = new Map<string, SessionView[]>();
  for (const x of s.data ?? []) {
    const k = new Date(x.startsAt).toDateString();
    days.set(k, [...(days.get(k) ?? []), x]);
  }
  return (
    <Screen refreshing={s.isRefetching} onRefresh={s.refetch}>
      <T v="h1">Schedule</T>
      <T color={p.muted}>Live sessions in the next two weeks.</T>
      {s.error ? (
        <ErrorState message={errorMessage(s.error)} onRetry={s.refetch} />
      ) : !s.data ? (
        <Loading />
      ) : s.data.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Nothing scheduled"
          message="Live classes and office hours for your courses show up here."
        />
      ) : (
        [...days.entries()].map(([day, list], di) => (
          <FadeIn key={day} delay={di * 60} style={{ gap: 10 }}>
            <T v="overline">
              {new Date(list[0].startsAt).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </T>
            {list.map(x => (
              <Card
                key={x.id}
                style={{ gap: 10, opacity: x.cancelled ? 0.6 : 1 }}
              >
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 52, alignItems: 'center' }}>
                    <T v="h3">{time(x.startsAt)}</T>
                    <T v="small" color={p.muted}>
                      {time(x.endsAt)}
                    </T>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Badge label={KIND[x.kind]} tone="orbit" />
                      {x.cancelled && <Badge label="Cancelled" tone="danger" />}
                    </View>
                    <T v="h3">{x.title}</T>
                    <T v="small" color={p.muted}>
                      {x.courseTitle}
                      {x.hostName ? ` · ${x.hostName}` : ''}
                      {x.location ? ` · ${x.location}` : ''}
                    </T>
                  </View>
                  <IconTile icon="video" hue={x.courseHue} size={36} />
                </View>
                {x.meetingUrl && !x.cancelled && (
                  <Button
                    title="Join"
                    small
                    icon="video"
                    onPress={() => Linking.openURL(x.meetingUrl!)}
                    style={{ alignSelf: 'flex-start' }}
                  />
                )}
              </Card>
            ))}
          </FadeIn>
        ))
      )}
    </Screen>
  );
}
