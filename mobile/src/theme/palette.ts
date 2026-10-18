import type { Hue } from '../lib/types';

/** The Orbitly design tokens (frontend/src/app/orbitly.css) as light and dark palettes. */
const light = {
  dark: false,
  bg: '#FBFAF7',
  card: '#FFFFFF',
  sunken: '#F5F3EE',
  hover: '#F5F6F9',
  border: '#ECEDF3',
  borderStrong: '#D8DAE6',
  text: '#161A33',
  body: '#363C5C',
  muted: '#6A7092',
  subtle: '#8D92AF',
  inverse: '#161A33',
  onInverse: '#FFFFFF',
  accent: '#FF6B57',
  accentPress: '#E2533F',
  accentText: '#C2412E',
  accentSoft: '#FFF4F1',
  accentTint: '#FFE7E2',
  success: '#1FAA6F',
  successText: '#13774D',
  successSoft: '#DDF5E9',
  warning: '#F2A516',
  warningText: '#9A5B00',
  warningSoft: '#FDF0D3',
  danger: '#E5404D',
  dangerText: '#B4232F',
  dangerSoft: '#FCE1E3',
  info: '#2F8CE6',
  infoText: '#155FA8',
  infoSoft: '#DEEDFC',
  orbit: '#7461F0',
  orbitText: '#4632B8',
  orbitSoft: '#ECE9FE',
  night: '#161A33',
  nightDeep: '#0E1024',
  nightText: '#B5B9CE',
  shadow: '#161A33',
  hue: {
    coral: ['#FFE7E2', '#FF6B57'],
    orbit: ['#ECE9FE', '#7461F0'],
    green: ['#DDF5E9', '#1FAA6F'],
    amber: ['#FDF0D3', '#F2A516'],
    sky: ['#DEEDFC', '#2F8CE6'],
    ink: ['#ECEDF3', '#363C5C'],
  } as Record<Hue, [string, string]>,
};

export type Palette = typeof light;

const dark: Palette = {
  dark: true,
  bg: '#0D1020',
  card: '#161A2F',
  sunken: '#12152A',
  hover: '#1D2138',
  border: '#272B47',
  borderStrong: '#383D5C',
  text: '#EEF0F8',
  body: '#C3C7DA',
  muted: '#8B91AD',
  subtle: '#6F7595',
  inverse: '#EEF0F8',
  onInverse: '#12152A',
  accent: '#FF6B57',
  accentPress: '#FF7F6D',
  accentText: '#FF9E90',
  accentSoft: '#2A1B23',
  accentTint: '#3A2128',
  success: '#2BC184',
  successText: '#62DBA3',
  successSoft: '#123427',
  warning: '#F2A516',
  warningText: '#F7C46A',
  warningSoft: '#3A2D12',
  danger: '#EF5361',
  dangerText: '#FF8E97',
  dangerSoft: '#3C1B22',
  info: '#3C97EC',
  infoText: '#82BBF6',
  infoSoft: '#14293F',
  orbit: '#8573F6',
  orbitText: '#B6ABFF',
  orbitSoft: '#26234B',
  night: '#191D38',
  nightDeep: '#0E1024',
  nightText: '#B5B9CE',
  shadow: '#000000',
  hue: {
    coral: ['#3A2128', '#FF7F6D'],
    orbit: ['#26234B', '#9989FB'],
    green: ['#123427', '#2BC184'],
    amber: ['#3A2D12', '#F2A516'],
    sky: ['#14293F', '#3C97EC'],
    ink: ['#272B47', '#C3C7DA'],
  },
};

export const palettes = { light, dark };

export function hueOf(p: Palette, name: string | null | undefined) {
  return p.hue[(name ?? 'coral') as Hue] ?? p.hue.coral;
}

export const fonts = {
  display: 'Sora-SemiBold',
  displayBold: 'Sora-Bold',
  body: 'Figtree-Regular',
  medium: 'Figtree-Medium',
  semibold: 'Figtree-SemiBold',
  bold: 'Figtree-Bold',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
