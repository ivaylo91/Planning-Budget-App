import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Slug = 'billa' | 'lidl' | 'kaufland' | 'metro' | 'fantastico';

const CONFIG: Record<Slug, { bg: string; fg: string; label: string }> = {
  billa:      { bg: '#E30613', fg: '#ffffff', label: 'B' },
  lidl:       { bg: '#0050AA', fg: '#F4C430', label: 'L' },
  kaufland:   { bg: '#E40521', fg: '#ffffff', label: 'K' },
  metro:      { bg: '#003882', fg: '#ffffff', label: 'M' },
  fantastico: { bg: '#e57a4e', fg: '#ffffff', label: 'F' },
};

export function StoreIcon({ slug, size = 24 }: { slug: string; size?: number }) {
  const cfg = CONFIG[slug as Slug];
  if (!cfg) return null;
  return (
    <View style={[styles.base, {
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.28),
      backgroundColor: cfg.bg,
    }]}>
      <Text style={[styles.label, { fontSize: size * 0.56, color: cfg.fg }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '900', includeFontPadding: false },
});
