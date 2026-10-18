import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from './lib/api';
import { SessionProvider } from './lib/session';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider, usePalette } from './theme/ThemeProvider';

function Themed() {
  const p = usePalette();
  const base = p.dark ? DarkTheme : DefaultTheme;
  return (
    <>
      <StatusBar barStyle={p.dark ? 'light-content' : 'dark-content'} />
      <NavigationContainer
        theme={{
          ...base,
          colors: {
            ...base.colors,
            primary: p.accent,
            background: p.bg,
            card: p.card,
            text: p.text,
            border: p.border,
            notification: p.accent,
          },
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (n, e) =>
              !(e instanceof ApiError && e.status > 0 && e.status < 500) &&
              n < 2,
          },
        },
      }),
  );
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <Themed />
          </SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
