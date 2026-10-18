import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

import {
  Card,
  ErrorState,
  FadeIn,
  IconTile,
  Loading,
  ProgressBar,
  Screen,
  Segmented,
  StatCard,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { relative } from '../../lib/format';
import { useSession } from '../../lib/session';
import type { AdminOverview, Metric } from '../../lib/types';
import { usePalette } from '../../theme/ThemeProvider';

type Range = AdminOverview['range'];
const ACTIVITY: Record<string, [string, string]> = {
  MEMBER_JOINED: ['user-plus', 'sky'],
  ENROLLED: ['graduation-cap', 'coral'],
  COURSE_COMPLETED: ['award', 'green'],
  PURCHASE: ['receipt', 'green'],
  COURSE_PUBLISHED: ['sparkles', 'orbit'],
  SEAT_ALERT: ['triangle-alert', 'amber'],
};

const delta = (m: Metric, unit = '') =>
  m.delta == null
    ? 'vs previous period'
    : `${m.delta >= 0 ? '+' : ''}${m.delta}${unit} vs previous`;

export function AdminHomeScreen() {
  const p = usePalette();
  const { org } = useSession();
  const [range, setRange] = useState<Range>('MONTHS_6');
  const o = useQuery({
    queryKey: ['admin-overview', range],
    queryFn: () =>
      api.get<AdminOverview>(`/admin/analytics/overview?range=${range}`),
  });
  const d = o.data;
  const max = Math.max(
    1,
    ...(d?.series.map(s => Math.max(s.enrollments, s.completions)) ?? [1]),
  );
  return (
    <Screen refreshing={o.isRefetching} onRefresh={o.refetch}>
      <FadeIn style={{ gap: 2 }}>
        <T v="overline">{org?.name}</T>
        <T v="h1">Platform analytics</T>
      </FadeIn>
      <Segmented
        value={range}
        onChange={setRange}
        items={[
          { value: 'DAYS_30', label: '30 days' },
          { value: 'MONTHS_6', label: '6 months' },
          { value: 'YEAR', label: 'Year' },
        ]}
      />
      {o.error ? (
        <ErrorState message={errorMessage(o.error)} onRetry={o.refetch} />
      ) : !d ? (
        <Loading />
      ) : (
        <>
          <FadeIn
            delay={60}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
          >
            <StatCard
              label="Active learners"
              value={String(d.activeLearners.value)}
              icon="users"
              hue="sky"
              hint={delta(d.activeLearners)}
            />
            <StatCard
              label="Courses live"
              value={String(d.coursesLive.value)}
              icon="library"
              hue="orbit"
              hint={delta(d.coursesLive)}
            />
            <StatCard
              label="Completion"
              value={`${d.completionRatePercent.value}%`}
              icon="target"
              hue="green"
              hint={delta(d.completionRatePercent, ' pts')}
            />
            <StatCard
              label="Seats used"
              value={String(d.seats.used)}
              icon="building-2"
              hue="amber"
              hint={d.seats.limit ? `of ${d.seats.limit}` : 'No seat limit'}
            />
          </FadeIn>
          {d.seats.percent != null && (
            <Card style={{ gap: 8 }}>
              <T v="label">Seat usage · {d.seats.percent}%</T>
              <ProgressBar
                value={d.seats.percent}
                color={d.seats.percent >= 90 ? p.danger : p.orbit}
              />
            </Card>
          )}
          <FadeIn delay={120}>
            <Card style={{ gap: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <T v="h3">Enrollments vs completions</T>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Legend color={p.inverse} label="Enrolled" />
                  <Legend color={p.accent} label="Completed" />
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  height: 170,
                }}
              >
                {d.series.map((s, i) => (
                  <View
                    key={s.start}
                    style={{ alignItems: 'center', gap: 6, flex: 1 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        gap: 3,
                        height: 140,
                      }}
                    >
                      <Bar
                        h={(s.enrollments / max) * 140}
                        color={p.inverse}
                        delay={i * 60}
                      />
                      <Bar
                        h={(s.completions / max) * 140}
                        color={p.accent}
                        delay={i * 60 + 100}
                      />
                    </View>
                    <T v="small" color={p.muted} style={{ fontSize: 11 }}>
                      {s.label}
                    </T>
                  </View>
                ))}
              </View>
            </Card>
          </FadeIn>
          <FadeIn delay={180}>
            <Card padding={4}>
              <T v="h3" style={{ padding: 12, paddingBottom: 4 }}>
                Recent activity
              </T>
              {d.recentActivity.length === 0 ? (
                <T v="small" color={p.muted} style={{ padding: 12 }}>
                  Nothing yet.
                </T>
              ) : (
                d.recentActivity.slice(0, 10).map((a, i) => {
                  const [ic, hue] = ACTIVITY[a.kind] ?? ['activity', 'ink'];
                  return (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                      }}
                    >
                      <IconTile icon={ic} hue={hue} size={34} />
                      <View style={{ flex: 1 }}>
                        <T v="label" numberOfLines={2}>
                          {a.text}
                        </T>
                        <T v="small" color={p.muted}>
                          {relative(a.at)}
                        </T>
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

function Bar({ h, color, delay }: { h: number; color: string; delay: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [a, h, delay]);
  return (
    <Animated.View
      style={{
        width: 10,
        borderRadius: 4,
        backgroundColor: color,
        height: a.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.max(3, h)],
        }),
      }}
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }}
      />
      <T v="small" color={p.muted} style={{ fontSize: 11 }}>
        {label}
      </T>
    </View>
  );
}
