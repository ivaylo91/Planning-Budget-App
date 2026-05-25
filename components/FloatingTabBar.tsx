import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../constants/colors';
import { HomeIcon, SearchIcon, ListIcon, ChartIcon, TagIcon } from './Icons';

export const FLOATING_TAB_HEIGHT = 76;

const ROUTE_CONFIG: Record<string, { label: string; icon: (focused: boolean, color: string) => React.ReactNode }> = {
  index: {
    label: 'Начало',
    icon: (f, c) => <HomeIcon size={20} color={c} />,
  },
  search: {
    label: 'Търсене',
    icon: (f, c) => <SearchIcon size={20} color={c} />,
  },
  list: {
    label: 'Списък',
    icon: (f, c) => <ListIcon size={20} color={c} />,
  },
  budget: {
    label: 'Бюджет',
    icon: (f, c) => <ChartIcon size={20} color={c} />,
  },
  promotions: {
    label: 'Промо',
    icon: (f, c) => <TagIcon size={20} color={c} />,
  },
};

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad, paddingHorizontal: 18 }]}>
      <View style={[styles.bar, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const cfg = ROUTE_CONFIG[route.name];
          if (!cfg) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tab}
            >
              {isFocused ? (
                <LinearGradient
                  colors={['#e57a4e', '#ffba8b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activePill}
                >
                  {cfg.icon(true, '#fff')}
                  <Text style={styles.activeLabel}>{cfg.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveIcon}>
                  {cfg.icon(false, c.inkFaint)}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowOpacity: 0.13,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  activeLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inactiveIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
