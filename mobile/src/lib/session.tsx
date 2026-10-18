import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_API_URL, DEFAULT_ORG } from '../config';
import { api } from './api';
import { prefs, secureSession } from './storage';
import type { AuthResponse, OrgView, Role, UserView } from './types';

export type Area = 'learn' | 'teach' | 'admin';

export const homeArea = (role: Role): Area =>
  role === 'ADMIN' ? 'admin' : role === 'INSTRUCTOR' ? 'teach' : 'learn';

/** Areas a role may open: staff can also learn, admins can also teach. */
export const areasFor = (role: Role): Area[] =>
  role === 'ADMIN'
    ? ['admin', 'teach', 'learn']
    : role === 'INSTRUCTOR'
    ? ['teach', 'learn']
    : ['learn'];

interface SessionState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: UserView | null;
  org: OrgView | null;
  role: Role | null;
  area: Area;
  orgSlug: string;
  apiUrl: string;
}

interface SessionApi extends SessionState {
  login: (orgSlug: string, email: string, password: string) => Promise<void>;
  signup: (
    orgSlug: string,
    fullName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setArea: (a: Area) => void;
  setApiUrl: (url: string) => Promise<void>;
  setUser: (u: UserView) => void;
}

const Ctx = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [s, setS] = useState<SessionState>({
    status: 'loading',
    user: null,
    org: null,
    role: null,
    area: 'learn',
    orgSlug: DEFAULT_ORG,
    apiUrl: DEFAULT_API_URL,
  });

  const signedIn = useCallback((auth: AuthResponse, keepArea = false) => {
    secureSession.save({
      refreshToken: auth.refreshToken,
      orgSlug: auth.organization.slug,
    });
    prefs.set('org', auth.organization.slug);
    setS(prev => ({
      ...prev,
      status: 'signedIn',
      user: auth.user,
      org: auth.organization,
      role: auth.role,
      orgSlug: auth.organization.slug,
      area:
        keepArea && prev.role === auth.role ? prev.area : homeArea(auth.role),
    }));
  }, []);

  const signedOut = useCallback(() => {
    secureSession.clear();
    qc.clear();
    setS(prev => ({
      ...prev,
      status: 'signedOut',
      user: null,
      org: null,
      role: null,
    }));
  }, [qc]);

  // Restore: server address, last organization, then the stored refresh token.
  useEffect(() => {
    api.onSession = auth => (auth ? signedIn(auth, true) : signedOut());
    (async () => {
      const [url, org, stored] = await Promise.all([
        prefs.get('apiUrl'),
        prefs.get('org'),
        secureSession.load(),
      ]);
      if (url) api.baseUrl = url;
      setS(prev => ({
        ...prev,
        apiUrl: api.baseUrl,
        orgSlug: org ?? prev.orgSlug,
      }));
      if (!stored) return setS(prev => ({ ...prev, status: 'signedOut' }));
      api.setTokens(null, stored.refreshToken);
      const auth = await api.refresh().catch(() => null);
      if (!auth) setS(prev => ({ ...prev, status: 'signedOut' }));
    })();
  }, [signedIn, signedOut]);

  const value = useMemo<SessionApi>(
    () => ({
      ...s,
      login: async (orgSlug, email, password) => {
        const auth = await api.post<AuthResponse>('/auth/login', {
          orgSlug: orgSlug.trim().toLowerCase(),
          email: email.trim(),
          password,
        });
        api.setTokens(auth.accessToken, auth.refreshToken);
        signedIn(auth);
      },
      signup: async (orgSlug, fullName, email, password) => {
        const auth = await api.post<AuthResponse>('/auth/signup', {
          orgSlug: orgSlug.trim().toLowerCase(),
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });
        api.setTokens(auth.accessToken, auth.refreshToken);
        signedIn(auth);
      },
      logout: async () => {
        const refresh = (await secureSession.load())?.refreshToken;
        if (refresh)
          await api
            .post('/auth/logout', { refreshToken: refresh })
            .catch(() => {});
        api.setTokens(null, null);
        signedOut();
      },
      setArea: area => {
        qc.clear();
        setS(prev => ({ ...prev, area }));
      },
      setApiUrl: async url => {
        const clean = url.trim().replace(/\/+$/, '');
        api.baseUrl = clean || DEFAULT_API_URL;
        await prefs.set(
          'apiUrl',
          clean && clean !== DEFAULT_API_URL ? clean : null,
        );
        setS(prev => ({ ...prev, apiUrl: api.baseUrl }));
      },
      setUser: user => setS(prev => ({ ...prev, user })),
    }),
    [s, signedIn, signedOut, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
