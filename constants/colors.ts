
const pastel = {
  canvas: '#fde9d6',
  surface: '#fff7ed',
  surfaceAlt: '#fcdcc0',
  ink: '#3a2415',
  inkSoft: '#7a5c45',
  inkFaint: '#b89978',
  accent: '#e57a4e',
  accentSoft: '#ffd6b8',
  good: '#7a9b66',
  warn: '#d99a4a',
  bad: '#c4583a',
  divider: 'rgba(58,36,21,0.07)',
  shadow: '#3a2415',
  statusBar: 'dark' as const,
  stores: {
    billa: '#E30613',
    lidl: '#0050AA',
    kaufland: '#E40521',
    metro: '#003882',
    fantastico: '#e57a4e',
  },
};

const pastelDark = {
  canvas: '#1e1208',
  surface: '#2a1c10',
  surfaceAlt: '#36261a',
  ink: '#f5e8d8',
  inkSoft: '#c0a080',
  inkFaint: '#7a5c45',
  accent: '#e57a4e',
  accentSoft: 'rgba(229,122,78,0.20)',
  good: '#7a9b66',
  warn: '#d99a4a',
  bad: '#c4583a',
  divider: 'rgba(245,232,216,0.07)',
  shadow: '#000000',
  statusBar: 'light' as const,
  stores: {
    billa: '#E30613',
    lidl: '#0050AA',
    kaufland: '#E40521',
    metro: '#003882',
    fantastico: '#e57a4e',
  },
};

export type AppColors = typeof pastel;

export function useColors(): AppColors {
  return pastel;
}

export const Colors = pastel;

export const Gradients = {
  accent: ['#e57a4e', '#ffba8b'] as const,
  good: ['#7a9b66', '#a5c490'] as const,
  canvas: ['#fde9d6', '#fff7ed'] as const,
  bad: ['#c4583a', '#e07055'] as const,
};
