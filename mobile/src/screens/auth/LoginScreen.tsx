import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  Button,
  ErrorState,
  FadeIn,
  Field,
  Screen,
  T,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { RootScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

export function LoginScreen({ navigation, route }: RootScreen<'Login'>) {
  const p = usePalette();
  const session = useSession();
  const [org, setOrg] = useState(session.orgSlug);
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await session.login(org, email, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <FadeIn style={{ gap: 6 }}>
          <T v="h1">Welcome back</T>
          <T color={p.muted}>Sign in to pick up where you left off.</T>
        </FadeIn>
        <FadeIn delay={80} style={{ gap: 14 }}>
          {error && <ErrorState message={error} />}
          <Field
            label="Organization"
            icon="building-2"
            value={org}
            onChangeText={setOrg}
            autoCapitalize="none"
            autoCorrect={false}
            hint="Your school or company's Orbitly address, e.g. northfield"
          />
          <Field
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
          />
          <Field
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          <Pressable
            onPress={() => navigation.navigate('Forgot')}
            style={{ alignSelf: 'flex-end' }}
            hitSlop={8}
          >
            <T v="label" color={p.accentText}>
              Forgot password?
            </T>
          </Pressable>
          <Button
            title="Sign in"
            onPress={submit}
            loading={busy}
            disabled={!org || !email || !password}
          />
          <Button
            title="New here? Create an account"
            variant="ghost"
            onPress={() => navigation.navigate('Signup')}
          />
        </FadeIn>
        <ServerSettings />
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Lets a development build point at another API (e.g. a different Wi-Fi address for the Mac running Spring Boot). */
export function ServerSettings() {
  const p = usePalette();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(session.apiUrl);
  const [status, setStatus] = useState<string | null>(null);
  const test = async () => {
    await session.setApiUrl(url);
    setStatus('Checking…');
    try {
      const res = await fetch(api.baseUrl + '/actuator/health');
      const j = await res.json();
      setStatus(
        j.status === 'UP'
          ? 'Connected — the API is up.'
          : `API answered: ${j.status}`,
      );
    } catch {
      setStatus(`Can't reach ${api.baseUrl}`);
    }
  };
  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      <Pressable
        onPress={() => setOpen(o => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        hitSlop={8}
      >
        <Icon name="server" size={16} color={p.muted} />
        <T v="small" color={p.muted}>
          Server: {session.apiUrl.replace(/^https?:\/\//, '')}
        </T>
        <Icon
          name={open ? 'chevron-down' : 'chevron-right'}
          size={14}
          color={p.muted}
        />
      </Pressable>
      {open && (
        <View style={{ gap: 10 }}>
          <Field
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.10:8080"
          />
          <Button
            title="Save and test"
            small
            variant="secondary"
            icon="refresh-cw"
            onPress={test}
            style={{ alignSelf: 'flex-start' }}
          />
          {status && (
            <T v="small" color={p.muted}>
              {status}
            </T>
          )}
        </View>
      )}
    </View>
  );
}
