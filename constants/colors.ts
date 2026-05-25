import { useColorScheme } from 'react-native';

const light = {
  canvas: '#f6efe3',
  surface: '#fffaf0',
  surfaceAlt: '#f0e6d2',
  ink: '#2b1d12',
  inkSoft: '#6b5a48',
  inkFaint: '#a89880',
  accent: '#c64e2e',
  accentSoft: '#f8d9cd',
  good: '#5f7d4b',
  warn: '#c98a2b',
  bad: '#a8412a',
  divider: 'rgba(43,29,18,0.08)',
  shadow: '#2b1d12',
  statusBar: 'dark' as const,
  stores: {
    billa: '#E30613',
    lidl: '#0050AA',
    kaufland: '#E40521',
    metro: '#003882',
    fantastico: '#c64e2e',
  },
};

const dark = {
  canvas: '#1c1510',
  surface: '#262018',
  surfaceAlt: '#302820',
  ink: '#f2e8d8',
  inkSoft: '#b8a08a',
  inkFaint: '#6a5848',
  accent: '#d4603c',
  accentSoft: 'rgba(212,96,60,0.18)',
  good: '#6e9456',
  warn: '#d49a3a',
  bad: '#c0503a',
  divider: 'rgba(242,232,216,0.08)',
  shadow: '#000000',
  statusBar: 'light' as const,
  stores: {
    billa: '#E30613',
    lidl: '#0050AA',
    kaufland: '#E40521',
    metro: '#003882',
    fantastico: '#d4603c',
  },
};

export type AppColors = typeof light;

export function useColors(): AppColors {
  return useColorScheme() === 'dark' ? dark : light;
}

// Static light palette kept for non-hook contexts (StyleSheet defaults, etc.)
export const Colors = light;
