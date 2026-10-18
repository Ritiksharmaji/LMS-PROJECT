import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  FadeIn,
  Field,
  IconTile,
  Row,
  Screen,
  Segmented,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { role as roleLabel } from '../../lib/format';
import { areasFor, useSession, type Area } from '../../lib/session';
import type { UserView } from '../../lib/types';
import type { TabScreen } from '../../navigation/types';
import { useTheme, type ThemeChoice } from '../../theme/ThemeProvider';

const AREA_LABEL: Record<Area, string> = {
  learn: 'Learn',
  teach: 'Teach',
  admin: 'Admin',
};

export function ProfileScreen({ navigation }: TabScreen<'Profile'>) {
  const { p, choice, setChoice } = useTheme();
  const s = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.user?.fullName ?? '');
  const settings = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () =>
      api.get<{ emailEnabled: boolean }>('/me/notification-settings'),
  });
  const email = useMutation({
    mutationFn: (emailEnabled: boolean) =>
      api.put<{ emailEnabled: boolean }>('/me/notification-settings', {
        emailEnabled,
      }),
    onSuccess: () => settings.refetch(),
  });
  const save = useMutation({
    mutationFn: () => api.patch<UserView>('/me', { fullName: name.trim() }),
    onSuccess: u => {
      s.setUser(u);
      setEditing(false);
    },
    onError: e => Alert.alert("Couldn't save", errorMessage(e)),
  });
  const areas = s.role ? areasFor(s.role) : ['learn' as Area];

  return (
    <Screen>
      <FadeIn>
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          <Avatar name={s.user?.fullName} uri={s.user?.avatarUrl} size={72} />
          {editing ? (
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
              <Field value={name} onChangeText={setName} autoFocus />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  small
                  onPress={() => setEditing(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save"
                  small
                  loading={save.isPending}
                  disabled={!name.trim()}
                  onPress={() => save.mutate()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <>
              <T v="h2">{s.user?.fullName}</T>
              <T v="small" color={p.muted}>
                {s.user?.email}
              </T>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {s.role && (
                  <Badge
                    label={roleLabel(s.role)}
                    tone={
                      s.role === 'ADMIN'
                        ? 'dark'
                        : s.role === 'INSTRUCTOR'
                        ? 'orbit'
                        : 'accent'
                    }
                  />
                )}
                <Badge label={s.org?.name ?? s.orgSlug} />
              </View>
              <Button
                title="Edit name"
                variant="ghost"
                small
                icon="pencil"
                onPress={() => setEditing(true)}
              />
            </>
          )}
        </Card>
      </FadeIn>

      {areas.length > 1 && (
        <FadeIn delay={60} style={{ gap: 8 }}>
          <T v="overline">Area</T>
          <Segmented
            value={s.area}
            onChange={s.setArea}
            items={areas.map(a => ({
              value: a,
              label: AREA_LABEL[a],
              icon:
                a === 'learn'
                  ? 'graduation-cap'
                  : a === 'teach'
                  ? 'presentation'
                  : 'shield-check',
            }))}
          />
        </FadeIn>
      )}

      <FadeIn delay={100} style={{ gap: 8 }}>
        <T v="overline">Appearance</T>
        <Segmented<ThemeChoice>
          value={choice}
          onChange={setChoice}
          items={[
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'dark', label: 'Dark', icon: 'moon' },
            { value: 'system', label: 'System', icon: 'monitor' },
          ]}
        />
      </FadeIn>

      <FadeIn delay={140}>
        <Card padding={4}>
          <View style={{ paddingHorizontal: 12 }}>
            <Row
              title="Notifications"
              left={<IconTile icon="bell" hue="coral" size={34} />}
              onPress={() => navigation.navigate('Notifications')}
            />
            {s.area === 'learn' && (
              <>
                <Row
                  title="Grades"
                  left={<IconTile icon="award" hue="green" size={34} />}
                  onPress={() => navigation.navigate('Grades')}
                />
                <Row
                  title="Wishlist"
                  left={<IconTile icon="heart" hue="coral" size={34} />}
                  onPress={() => navigation.navigate('Wishlist')}
                />
                <Row
                  title="Orders & refunds"
                  left={<IconTile icon="receipt" hue="sky" size={34} />}
                  onPress={() => navigation.navigate('Orders')}
                />
              </>
            )}
            <Row
              last
              title="Email me about activity"
              subtitle="Grades, replies, sessions and reminders"
              left={<IconTile icon="mail" hue="orbit" size={34} />}
              right={
                <Switch
                  value={settings.data?.emailEnabled ?? true}
                  onValueChange={v => email.mutate(v)}
                  trackColor={{ true: p.accent, false: p.borderStrong }}
                  thumbColor="#fff"
                />
              }
            />
          </View>
        </Card>
      </FadeIn>

      <Button
        title="Sign out"
        variant="secondary"
        icon="log-out"
        onPress={() =>
          Alert.alert('Sign out?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: s.logout },
          ])
        }
      />
      <T v="small" color={p.subtle} style={{ textAlign: 'center' }}>
        Orbitly for {s.org?.name ?? s.orgSlug} ·{' '}
        {s.apiUrl.replace(/^https?:\/\//, '')}
      </T>
    </Screen>
  );
}
