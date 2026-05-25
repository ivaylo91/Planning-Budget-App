import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors, Gradients } from '../../constants/colors';
import { getActiveShoppingList, getWatchlist } from '../../lib/queries';
import { formatPrice, eurToBgn, formatEur } from '../../lib/currency';
import { DonutChart } from '../../components/DonutChart';
import { SearchIcon, TagIcon, ChevronRightIcon, SparkleIcon, BellIcon, SwapIcon, HeartIcon } from '../../components/Icons';
import { StoreIcon } from '../../components/StoreIcon';
import { ProductImage } from '../../components/ProductImage';
import { FLOATING_TAB_HEIGHT } from '../../components/FloatingTabBar';
import { useAuth } from '../../lib/auth';
import type { ShoppingList, ProductWithPrices } from '../../types';

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Добро утро! 👋';
  if (h >= 12 && h < 18) return 'Добър ден! 👋';
  if (h >= 18 && h < 24) return 'Добър вечер! 👋';
  return 'Добра нощ! 🌙';
}

export default function HomeScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [watched, setWatched] = useState<ProductWithPrices[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const initials = user?.email?.[0].toUpperCase() ?? '?';
  const displayName = user?.email?.split('@')[0] ?? '';

  const handleAvatarPress = () => router.push('/settings');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [listData, watchData] = await Promise.all([
        getActiveShoppingList(),
        getWatchlist().catch(() => []),
      ]);
      setList(listData);
      setWatched(watchData.slice(0, 3));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const totalSpent = (list?.items ?? []).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const progress = budgetBgn > 0 ? Math.min(totalSpent / budgetBgn, 1) : 0;
  const isOver = totalSpent > budgetBgn;
  const barColor = isOver ? c.bad : progress > 0.8 ? c.warn : c.good;
  const remaining = budgetBgn - totalSpent;
  const unchecked = (list?.items ?? []).filter((i) => !i.is_checked).slice(0, 3);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
              <LinearGradient colors={Gradients.accent} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.subGreeting} numberOfLines={1}>{displayName}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.bellBtn, { backgroundColor: c.surface }]} onPress={() => router.push('/settings')}>
            <BellIcon size={19} color={c.inkSoft} />
          </TouchableOpacity>
        </View>

        {/* Budget card */}
        <View style={[styles.budgetCard, { backgroundColor: c.surface }]}>
          <View style={styles.budgetRow}>
            <DonutChart
              progress={progress}
              size={96}
              color={barColor}
              trackColor={c.surfaceAlt}
              label={`${Math.round(progress * 100)}%`}
              sublabel="от бюджета"
              labelColor={barColor}
              sublabelColor={c.inkFaint}
            />
            <View style={styles.budgetInfo}>
              <Text style={styles.budgetListName} numberOfLines={1}>
                {list?.name ?? 'Без активен списък'}
              </Text>
              <Text style={styles.budgetAmount}>{formatEur(list?.budget_eur ?? 0)}</Text>
              <Text style={styles.budgetBgn}>{formatPrice(budgetBgn)}</Text>
              {list ? (
                <View style={[styles.remainingBadge, { backgroundColor: isOver ? '#ffdad3' : '#d8edcc' }]}>
                  <Text style={[styles.remainingText, { color: isOver ? c.bad : c.good }]}>
                    {isOver
                      ? `+${formatPrice(Math.abs(remaining))} над`
                      : `${formatPrice(remaining)} остава`}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => router.push('/(tabs)/list')}>
                  <Text style={styles.createListHint}>Създай списък →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <QuickAction
            icon={<SearchIcon size={18} color={c.accent} />}
            label="Търси"
            onPress={() => router.push('/(tabs)/search')}
            c={c}
          />
          <QuickAction
            icon={<TagIcon size={18} color={c.accent} />}
            label="Промоции"
            onPress={() => router.push('/(tabs)/promotions')}
            c={c}
          />
          <QuickAction
            icon={<SwapIcon size={18} color={c.accent} />}
            label="Бюджет"
            onPress={() => router.push('/(tabs)/budget')}
            c={c}
          />
        </View>

        {/* Watchlist preview */}
        {watched.length > 0 && (
          <TouchableOpacity
            style={[styles.listCard, { backgroundColor: c.surface }]}
            onPress={() => router.push('/watchlist')}
            activeOpacity={0.85}
          >
            <View style={styles.listCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <HeartIcon size={13} color="#e05252" />
                <Text style={styles.listCardTitle}>Следени продукти</Text>
              </View>
              <View style={[styles.listCardChip, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.listCardChipText, { color: c.accent }]}>{watched.length}</Text>
              </View>
            </View>
            {watched.map((item) => (
              <View key={item.id} style={styles.watchedItem}>
                <ProductImage uri={item.image_url} fallback={item.category?.icon ?? '📦'} size={32} borderRadius={8} bgColor={c.surfaceAlt} />
                <Text style={[styles.listItemName, { color: c.ink }]} numberOfLines={1}>{item.name}</Text>
                {item.cheapest_store && (
                  <StoreIcon slug={item.cheapest_store.slug} size={14} />
                )}
                {item.cheapest_price != null && (
                  <Text style={[styles.listItemPrice, { color: c.accent }]}>{formatPrice(item.cheapest_price)}</Text>
                )}
              </View>
            ))}
            <View style={[styles.listCardFooter, { borderTopColor: c.divider }]}>
              <Text style={[styles.listCardSeeAll, { color: c.accent }]}>Виж всички</Text>
              <ChevronRightIcon size={13} color={c.accent} />
            </View>
          </TouchableOpacity>
        )}

        {/* List preview */}
        {list && unchecked.length > 0 && (
          <TouchableOpacity
            style={[styles.listCard, { backgroundColor: c.surface }]}
            onPress={() => router.push('/(tabs)/list')}
            activeOpacity={0.85}
          >
            <View style={styles.listCardHeader}>
              <Text style={styles.listCardTitle}>Следващи покупки</Text>
              <View style={[styles.listCardChip, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.listCardChipText, { color: c.accent }]}>
                  {(list.items ?? []).filter((i) => !i.is_checked).length} продукта
                </Text>
              </View>
            </View>
            {unchecked.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={[styles.listItemDot, { backgroundColor: c.accentSoft }]} />
                <Text style={[styles.listItemName, { color: c.ink }]} numberOfLines={1}>
                  {item.product_name}
                </Text>
                {item.price_at_add ? (
                  <Text style={[styles.listItemPrice, { color: c.accent }]}>
                    {formatPrice(item.price_at_add * item.quantity)}
                  </Text>
                ) : null}
              </View>
            ))}
            <View style={[styles.listCardFooter, { borderTopColor: c.divider }]}>
              <Text style={[styles.listCardSeeAll, { color: c.accent }]}>Виж всички</Text>
              <ChevronRightIcon size={13} color={c.accent} />
            </View>
          </TouchableOpacity>
        )}

        {/* Recommendation card */}
        <LinearGradient
          colors={Gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recoCard}
        >
          <SparkleIcon size={18} color="rgba(255,255,255,0.85)" />
          <Text style={styles.recoTitle}>Съвет за деня</Text>
          <Text style={styles.recoText}>
            Сравни цените в 5 магазина преди да пазаруваш — спести до 30% от месечните разходи
          </Text>
          <TouchableOpacity style={styles.recoBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.recoBtnText}>Сравни сега</Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon, label, onPress, c,
}: { icon: React.ReactNode; label: string; onPress: () => void; c: AppColors }) {
  return (
    <TouchableOpacity
      style={[styles2.quickAction, { backgroundColor: c.surface, shadowColor: c.shadow }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles2.quickIconWrap, { backgroundColor: c.accentSoft }]}>{icon}</View>
      <Text style={[styles2.quickLabel, { color: c.inkSoft }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles2 = StyleSheet.create({
  quickAction: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 8,
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  quickIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
});

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.canvas },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, gap: 16 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    greeting: { fontSize: 17, fontWeight: '800', color: c.ink },
    subGreeting: { fontSize: 12, color: c.inkSoft, marginTop: 1 },
    bellBtn: {
      width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },

    budgetCard: {
      borderRadius: 22, padding: 18,
      shadowColor: c.shadow, shadowOpacity: 0.07, shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    budgetInfo: { flex: 1 },
    budgetListName: { fontSize: 10, fontWeight: '600', color: c.inkFaint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
    budgetAmount: { fontSize: 34, fontWeight: '800', color: c.ink, letterSpacing: -1 },
    budgetBgn: { fontSize: 14, color: c.inkSoft, marginTop: 1, marginBottom: 8 },
    remainingBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    remainingText: { fontSize: 12, fontWeight: '700' },
    createListHint: { fontSize: 13, color: c.accent, fontWeight: '700', marginTop: 4 },

    actionsRow: { flexDirection: 'row', gap: 10 },

    listCard: {
      borderRadius: 18, padding: 16,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    listCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    listCardTitle: { fontSize: 14, fontWeight: '700', color: c.ink },
    listCardChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    listCardChipText: { fontSize: 11, fontWeight: '700' },
    listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
    listItemDot: { width: 8, height: 8, borderRadius: 4 },
    watchedItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    listItemName: { flex: 1, fontSize: 14 },
    listItemPrice: { fontSize: 13, fontWeight: '700' },
    listCardFooter: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
      gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1,
    },
    listCardSeeAll: { fontSize: 12, fontWeight: '700' },

    recoCard: { borderRadius: 22, padding: 20, gap: 8 },
    recoTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    recoText: { fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 19 },
    recoBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
    recoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
}
