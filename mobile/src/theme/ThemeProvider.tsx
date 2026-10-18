import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { prefs } from '../lib/storage';
import { palettes, type Palette } from './palette';

export type ThemeChoice = 'light' | 'dark' | 'system';

const Ctx = createContext<{
  p: Palette;
  choice: ThemeChoice;
  setChoice: (c: ThemeChoice) => void;
}>({ p: palettes.light, choice: 'system', setChoice: () => {} });

/** Light / Dark / System, like the web app. The choice is remembered on the device. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  useEffect(() => {
    prefs.get('theme').then(v => {
      if (v === 'light' || v === 'dark') setChoiceState(v);
    });
  }, []);
  const value = useMemo(() => {
    const mode = choice === 'system' ? system ?? 'light' : choice;
    return {
      p: mode === 'dark' ? palettes.dark : palettes.light,
      choice,
      setChoice: (c: ThemeChoice) => {
        setChoiceState(c);
        prefs.set('theme', c === 'system' ? null : c);
      },
    };
  }, [choice, system]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
export const usePalette = () => useContext(Ctx).p;
