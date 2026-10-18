import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import {
  Button,
  Card,
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

export function SignupScreen({ navigation }: RootScreen<'Signup'>) {
  const p = usePalette();
  const session = useSession();
  const [org, setOrg] = useState(session.orgSlug);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await session.signup(org, name, email, password);
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
          <T v="h1">Create your account</T>
          <T color={p.muted}>
            Join as a student. Instructors and admins are invited by their
            organization.
          </T>
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
          />
          <Field
            label="Full name"
            icon="user"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
          />
          <Field
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
          />
          <Field
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint="At least 8 characters"
            textContentType="newPassword"
          />
          <Button
            title="Create account"
            onPress={submit}
            loading={busy}
            disabled={!org || !name || !email || password.length < 8}
          />
          <Button
            title="I already have an account"
            variant="ghost"
            onPress={() => navigation.replace('Login', { email })}
          />
        </FadeIn>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function ForgotScreen({ navigation }: RootScreen<'Forgot'>) {
  const p = usePalette();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/password/forgot', { email: email.trim() });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <FadeIn style={{ gap: 6 }}>
        <T v="h1">Forgot your password?</T>
        <T color={p.muted}>
          Enter your email and we'll send you a link to choose a new one.
        </T>
      </FadeIn>
      {sent ? (
        <Card style={{ gap: 8 }}>
          <T v="h3">Check your inbox</T>
          <T v="small" color={p.muted}>
            If an account exists for {email}, a reset link is on its way. It
            works for one hour.
          </T>
          <Button
            title="Back to sign in"
            variant="secondary"
            small
            onPress={() => navigation.replace('Login', { email })}
            style={{ alignSelf: 'flex-start', marginTop: 6 }}
          />
        </Card>
      ) : (
        <FadeIn delay={80} style={{ gap: 14 }}>
          {error && <ErrorState message={error} />}
          <Field
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button
            title="Send reset link"
            icon="send"
            onPress={submit}
            loading={busy}
            disabled={!email}
          />
        </FadeIn>
      )}
    </Screen>
  );
}
