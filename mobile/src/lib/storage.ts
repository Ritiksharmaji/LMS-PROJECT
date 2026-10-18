import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const SESSION_SERVICE = 'app.orbitly.session';

export interface StoredSession {
  refreshToken: string;
  orgSlug: string;
}

/** The refresh token lives in the iOS Keychain / Android Keystore, never in plain storage. */
export const secureSession = {
  async load(): Promise<StoredSession | null> {
    try {
      const c = await Keychain.getGenericPassword({ service: SESSION_SERVICE });
      return c ? (JSON.parse(c.password) as StoredSession) : null;
    } catch {
      return null;
    }
  },
  async save(s: StoredSession) {
    await Keychain.setGenericPassword('orbitly', JSON.stringify(s), {
      service: SESSION_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  async clear() {
    await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
  },
};

/** Non-secret preferences (theme, server address, last organization). */
export const prefs = {
  get: (key: string) =>
    AsyncStorage.getItem('orbitly.' + key).catch(() => null),
  set: (key: string, value: string | null) =>
    (value == null
      ? AsyncStorage.removeItem('orbitly.' + key)
      : AsyncStorage.setItem('orbitly.' + key, value)
    ).catch(() => {}),
};
