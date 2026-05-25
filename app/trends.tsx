import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, AppColors, Gradients } from '../constants/colors';
import { getShoppingLists } from '../lib/queries';
import { eurToBgn, formatPrice } from '../lib/currency';
import { ChevronLeftIcon } from '../components/Icons';
import { StoreIcon } from '../components/StoreIcon';
import type { ShoppingList } from '../types';

function listTotal(list: ShoppingList) {
  return (list.items ?? []).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
}

function listBudgetBgn(list: ShoppingList) {
  return eurToBgn(list.budget_eur);
}

export default function TrendsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getShoppingLists();
      setLists(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Derived metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!lists.length) return null;

    let totalSpent = 0;
    let totalBudget = 0;
    let totalSaved = 0;
    let overCount = 0;

    // Store totals across all lists
    const storeMap: Record<string, { name: string; slug: string; total: number }> = {};

    for (const list of lists) {
      const spent = listTotal(list);
      const budget = listBudgetBgn(list);
      totalSpent += spent;
      totalBudget += budget;
      if (spent <= budget) totalSaved += budget - spent;
      else overCount++;

      for (const item of (list.items ?? [])) {
        if (!item.store_id || !item.price_at_add || !item.store) continue;
        const key = item.store_id;
        if (!storeMap[key]) storeMap[key] = { name: item.store.name, slug: item.store.slug, total: 0 };
        storeMap[key].total += item.price_at_add * item.quantity;
      }
    }

    const avgPerTrip = lists.length ? totalSpent / lists.length : 0;

    // Top store
    const storeEntries = Object.values(storeMap).sort((a, b) => b.total - a.total);

    // Best savings trip
    let bestSavings = 0;
    let bestSavingsList: ShoppingList | null = null;
    for (const list of lists) {
      const saved = listBudgetBgn(list) - listTotal(list);
      if (saved > bestSavings) { bestSavings = saved; bestSavingsList = list; }
    }

    return { totalSpent, totalBudget, totalSaved, avgPerTrip, overCount, storeEntries, bestSavings, bestSavingsList };
  }, [lists]);

  // Last 8 lists oldest→newest for chart
  const chartLists = useMemo(() => [...lists].reverse().slice(-8), [lists]);
  const chartMax = useMemo(() => Math.max(...chartLists.map((l) => Math.max(listTotal(l), listBudgetBgn(l))), 1), [chartLists]);

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: c.canvas }]}><ActivityIndicator size="large" color={c.accent} /></View>;
  }

  if (!lists.length) {
    return (
      <View style={[styles.root, { backgroundColor: c.canvas }]}>
        <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
            <ChevronLeftIcon size={20} color={c.ink} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Тенденции</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📊</Text>
          <Text style={[styles.emptyTitle, { color: c.ink }]}>Няма данни</Text>
          <Text style={[styles.emptyHint, { color: c.inkSoft }]}>Създай и попълни поне един списък</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      {/* Nav */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color={c.ink} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Тенденции</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
      >
        {/* Hero stats */}
        <LinearGradient colors={Gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <Text style={styles.heroLabel}>Общо похарчено</Text>
          <Text style={styles.heroAmount}>{formatPrice(metrics?.totalSpent ?? 0)}</Text>
          <View style={styles.heroRow}>
            <HeroStat label="Пазарувания" value={String(lists.length)} />
            <View style={styles.heroDiv} />
            <HeroStat label="Средно" value={formatPrice(metrics?.avgPerTrip ?? 0)} />
            <View style={styles.heroDiv} />
            <HeroStat label="Спестено" value={formatPrice(metrics?.totalSaved ?? 0)} />
          </View>
        </LinearGradient>

        {/* Bar chart — spending per list */}
        {chartLists.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Text style={styles.cardTitle}>По пазаруване</Text>
            <Text style={styles.cardSub}>Бюджет vs. похарчено</Text>

            <View style={styles.chartWrap}>
              {chartLists.map((list) => {
                const spent = listTotal(list);
                const budget = listBudgetBgn(list);
                const isOver = spent > budget;
                const spentPct = (spent / chartMax) * 100;
                const budgetPct = (budget / chartMax) * 100;
                const barColor = isOver ? c.bad : spent / budget > 0.8 ? c.warn : c.good;
                const date = new Date(list.created_at).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' });

                return (
                  <View key={list.id} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: c.inkSoft }]} numberOfLines={1}>{date}</Text>
                    <View style={styles.barTrackWrap}>
                      {/* Budget line */}
                      <View style={[styles.budgetLine, { left: `${budgetPct}%` as any, backgroundColor: c.inkFaint }]} />
                      {/* Spent bar */}
                      <View style={[styles.barTrack, { backgroundColor: c.surfaceAlt }]}>
                        <View style={[styles.barFill, { width: `${spentPct}%` as any, backgroundColor: barColor }]} />
                      </View>
                    </View>
                    <Text style={[styles.barAmount, { color: isOver ? c.bad : c.ink }]} numberOfLines={1}>
                      {formatPrice(spent)}
                    </Text>
                  </View>
                );
              })}

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c.good }]} />
                  <Text style={[styles.legendText, { color: c.inkSoft }]}>Похарчено</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: c.inkFaint }]} />
                  <Text style={[styles.legendText, { color: c.inkSoft }]}>Бюджет</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Store breakdown */}
        {(metrics?.storeEntries?.length ?? 0) > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Text style={styles.cardTitle}>По магазин</Text>
            <Text style={styles.cardSub}>Общо за всички пазарувания</Text>
            <StoreBreakdownChart entries={metrics!.storeEntries} c={c} />
          </View>
        )}

        {/* Insights */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={styles.cardTitle}>Прозрения</Text>

          {metrics?.storeEntries?.[0] && (
            <InsightRow
              emoji={null}
              icon={<StoreIcon slug={metrics.storeEntries[0].slug} size={22} />}
              label="Любим магазин"
              value={metrics.storeEntries[0].name}
              sub={formatPrice(metrics.storeEntries[0].total) + ' общо'}
              c={c}
            />
          )}
          <InsightRow emoji="🛒" label="Средно на пазаруване" value={formatPrice(metrics?.avgPerTrip ?? 0)} c={c} />
          {(metrics?.bestSavingsList) && (
            <InsightRow
              emoji="💚"
              label="Най-спестовен списък"
              value={metrics.bestSavingsList.name}
              sub={`Спестено ${formatPrice(metrics.bestSavings)}`}
              c={c}
            />
          )}
          <InsightRow
            emoji={metrics?.overCount ? '⚠️' : '✅'}
            label="Над бюджета"
            value={`${metrics?.overCount ?? 0} от ${lists.length} пазарувания`}
            c={c}
          />
        </View>

        {/* Budget adherence over time */}
        {lists.length >= 3 && <BudgetAdherence lists={chartLists} c={c} />}
      </ScrollView>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function StoreBreakdownChart({ entries, c }: { entries: { name: string; slug: string; total: number }[]; c: AppColors }) {
  const totalAll = entries.reduce((s, e) => s + e.total, 0);
  const max = entries[0]?.total ?? 1;

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {entries.map((e) => (
        <View key={e.slug} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StoreIcon slug={e.slug} size={20} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.ink }}>{e.name}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.ink }}>{formatPrice(e.total)}</Text>
            <Text style={{ fontSize: 11, color: c.inkFaint, minWidth: 34, textAlign: 'right' }}>
              {Math.round((e.total / totalAll) * 100)}%
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(e.total / max) * 100}%` as any, backgroundColor: c.stores[e.slug as keyof typeof c.stores] ?? c.accent, borderRadius: 999 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function InsightRow({
  emoji, icon, label, value, sub, c,
}: {
  emoji: string | null; icon?: React.ReactNode; label: string; value: string; sub?: string; c: AppColors;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.divider }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        {icon ?? <Text style={{ fontSize: 18 }}>{emoji}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: c.inkFaint }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{value}</Text>
        {sub && <Text style={{ fontSize: 11, color: c.inkSoft, marginTop: 1 }}>{sub}</Text>}
      </View>
    </View>
  );
}

function BudgetAdherence({ lists, c }: { lists: ShoppingList[]; c: AppColors }) {
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 }}>Спазване на бюджета</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {lists.map((list) => {
          const spent = listTotal(list);
          const budget = listBudgetBgn(list);
          const isOver = spent > budget;
          const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
          const color = isOver ? c.bad : pct > 0.8 ? c.warn : c.good;
          return (
            <View key={list.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ height: 48, width: '100%', backgroundColor: c.surfaceAlt, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' }}>
                <View style={{ height: `${pct * 100}%` as any, backgroundColor: color, borderRadius: 8 }} />
              </View>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
        {[['#7a9b66', 'В бюджета'], ['#d99a4a', '≥80%'], ['#c4583a', 'Над']].map(([col, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
            <Text style={{ fontSize: 11, color: c.inkSoft }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    emptyHint: { fontSize: 14, textAlign: 'center' },

    navBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    navTitle: { fontSize: 18, fontWeight: '800', color: c.ink, letterSpacing: -0.3 },

    content: { paddingHorizontal: 16, gap: 14 },

    heroCard: { borderRadius: 22, padding: 20, gap: 6 },
    heroLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.6 },
    heroAmount: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1.5, marginBottom: 8 },
    heroRow: { flexDirection: 'row', alignItems: 'center' },
    heroDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

    card: {
      borderRadius: 18, padding: 16, gap: 4,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: c.ink, letterSpacing: -0.2 },
    cardSub: { fontSize: 11, color: c.inkFaint, marginBottom: 8 },

    // Bar chart
    chartWrap: { gap: 10, marginTop: 4 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { width: 52, fontSize: 10, fontWeight: '600' },
    barTrackWrap: { flex: 1, position: 'relative' },
    barTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 999 },
    budgetLine: {
      position: 'absolute', width: 2, height: 16, borderRadius: 1,
      top: -3, zIndex: 2,
    },
    barAmount: { width: 56, fontSize: 10, fontWeight: '700', textAlign: 'right' },

    legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLine: { width: 12, height: 2, borderRadius: 1 },
    legendText: { fontSize: 11 },
  });
}
