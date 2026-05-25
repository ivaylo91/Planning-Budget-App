import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, AppColors, Gradients } from '../../constants/colors';
import { getActiveShoppingList, updateBudget } from '../../lib/queries';
import { eurToBgn, formatPrice, formatEur, bgnToEur } from '../../lib/currency';
import { DonutChart } from '../../components/DonutChart';
import { CheckIcon, SparkleIcon, ChevronRightIcon } from '../../components/Icons';
import { FLOATING_TAB_HEIGHT } from '../../components/FloatingTabBar';
import type { ShoppingList } from '../../types';

export default function BudgetScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getActiveShoppingList();
      setList(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = list?.items ?? [];
  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const totalInList = items.reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const totalBought = items.filter((i) => i.is_checked).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const remaining = budgetBgn - totalInList;
  const progress = budgetBgn > 0 ? Math.min(totalInList / budgetBgn, 1) : 0;
  const isOver = totalInList > budgetBgn;
  const barColor = isOver ? c.bad : progress > 0.8 ? c.warn : c.good;

  const handleSaveBudget = async () => {
    if (!list) return;
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) { Alert.alert('Грешка', 'Въведи валидна стойност.'); return; }
    try {
      await updateBudget(list.id, val);
      setList((prev) => prev ? { ...prev, budget_eur: val } : prev);
      setEditingBudget(false);
    } catch {
      Alert.alert('Грешка', 'Не можа да се актуализира бюджетът.');
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={c.accent} /></View>;
  }

  if (!list) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>💰</Text>
        <Text style={styles.emptyTitle}>Нямаш активен списък</Text>
        <Text style={styles.emptyHint}>Създай списък в таб „Списък" за да проследиш бюджета</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_HEIGHT + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
    >
      {/* Screen title */}
      <Text style={styles.screenTitle}>Бюджет</Text>

      {/* Main budget card */}
      <View style={[styles.mainCard, { backgroundColor: c.surface }]}>
        <View style={styles.mainCardRow}>
          <DonutChart
            progress={progress}
            size={104}
            strokeWidth={10}
            color={barColor}
            trackColor={c.surfaceAlt}
            label={`${Math.round(progress * 100)}%`}
            sublabel="изразходвано"
            labelColor={barColor}
            sublabelColor={c.inkFaint}
          />
          <View style={styles.mainCardInfo}>
            <Text style={styles.listName}>{list.name}</Text>

            {editingBudget ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.budgetInput}
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  keyboardType="numeric"
                  placeholder="€"
                  autoFocus
                  placeholderTextColor={c.inkFaint}
                />
                <TouchableOpacity style={[styles.editActionBtn, { backgroundColor: c.accent }]} onPress={handleSaveBudget}>
                  <CheckIcon size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editActionBtn, { backgroundColor: c.surfaceAlt }]} onPress={() => setEditingBudget(false)}>
                  <Text style={{ color: c.inkSoft, fontWeight: '700', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setBudgetInput(list.budget_eur.toString()); setEditingBudget(true); }}>
                <Text style={styles.budgetEur}>{formatEur(list.budget_eur)}</Text>
                <Text style={styles.budgetBgn}>{formatPrice(budgetBgn)}</Text>
                <Text style={styles.editHint}>Натисни за промяна</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isOver ? (
          <View style={[styles.statusBanner, { backgroundColor: '#ffdad3' }]}>
            <Text style={[styles.statusBannerText, { color: c.bad }]}>⚠️ Надвишен с {formatPrice(Math.abs(remaining))}!</Text>
          </View>
        ) : (
          <View style={[styles.statusBanner, { backgroundColor: '#e8f5e0' }]}>
            <Text style={[styles.statusBannerText, { color: c.good }]}>
              Остават {formatPrice(remaining)} · {formatEur(bgnToEur(remaining))}
            </Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="В списъка" value={formatPrice(totalInList)} emoji="🛒" color={c.accent} c={c} />
        <StatCard label="Купено" value={formatPrice(totalBought)} emoji="✅" color={c.good} c={c} />
        <StatCard label="Продукти" value={String(items.length)} emoji="📦" color={c.warn} c={c} />
      </View>

      {items.length > 0 && <StoreBreakdown items={items} c={c} />}

      {/* Trends link */}
      <TouchableOpacity
        style={[styles.trendsBtn, { backgroundColor: c.surface }]}
        onPress={() => router.push('/trends')}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>📊</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.trendsBtnTitle, { color: c.ink }]}>Тенденции в разходите</Text>
          <Text style={[styles.trendsBtnSub, { color: c.inkSoft }]}>История, магазини, прозрения</Text>
        </View>
        <ChevronRightIcon size={16} color={c.inkFaint} />
      </TouchableOpacity>

      {/* Tips card */}
      <LinearGradient
        colors={['#fde9d6', '#fff7ed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tipsCard, { borderWidth: 1, borderColor: c.divider }]}
      >
        <View style={styles.tipsHeader}>
          <SparkleIcon size={16} color={c.accent} />
          <Text style={[styles.tipsTitle, { color: c.accent }]}>Съвети за спестяване</Text>
        </View>
        {[
          'Задръж продукт в списъка за изтриване',
          'Сравни цени преди да пазаруваш',
          '1 € = 1.95583 лв. (фиксиран курс)',
          'Провери промоциите в таб Промоции',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={[styles.tipDot, { color: c.accent }]}>·</Text>
            <Text style={[styles.tipText, { color: c.ink }]}>{tip}</Text>
          </View>
        ))}
      </LinearGradient>
    </ScrollView>
  );
}

function StatCard({ label, value, emoji, color, c }: { label: string; value: string; emoji: string; color: string; c: AppColors }) {
  return (
    <View style={{
      flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 14, alignItems: 'center',
      borderTopWidth: 3, borderTopColor: color,
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    }}>
      <Text style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: c.inkSoft, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function StoreBreakdown({ items, c }: { items: any[]; c: AppColors }) {
  const byStore: Record<string, { name: string; total: number; color: string }> = {};
  items.forEach((item) => {
    if (!item.store_id || !item.price_at_add) return;
    const slug = item.store?.slug ?? '';
    if (!byStore[item.store_id]) byStore[item.store_id] = {
      name: item.store?.name ?? 'Неизвестен',
      total: 0,
      color: c.stores[slug as keyof typeof c.stores] ?? c.accent,
    };
    byStore[item.store_id].total += item.price_at_add * item.quantity;
  });
  const entries = Object.values(byStore).sort((a, b) => b.total - a.total);
  if (!entries.length) return null;
  const maxTotal = entries[0].total;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: 16, shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>По магазин</Text>
      {entries.map((e) => (
        <View key={e.name} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: e.color, marginRight: 8 }} />
            <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontWeight: '500' }}>{e.name}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: e.color }}>{formatPrice(e.total)}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(e.total / maxTotal) * 100}%` as any, backgroundColor: e.color, borderRadius: 999 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    content: { paddingHorizontal: 18, gap: 14 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.ink, marginBottom: 6 },
    emptyHint: { fontSize: 14, color: c.inkSoft, textAlign: 'center', lineHeight: 20 },

    screenTitle: { fontSize: 24, fontWeight: '800', color: c.ink, letterSpacing: -0.5 },

    mainCard: {
      borderRadius: 24, padding: 20, gap: 14,
      shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    mainCardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    mainCardInfo: { flex: 1 },
    listName: { fontSize: 11, fontWeight: '600', color: c.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    budgetEur: { fontSize: 34, fontWeight: '800', color: c.ink, letterSpacing: -1 },
    budgetBgn: { fontSize: 15, color: c.inkSoft, marginTop: 2 },
    editHint: { fontSize: 11, color: c.inkFaint, marginTop: 5 },
    editRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    budgetInput: {
      flex: 1, borderWidth: 1.5, borderColor: c.accent, borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 9, fontSize: 20, fontWeight: '700', color: c.ink,
    },
    editActionBtn: { borderRadius: 10, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    statusBanner: { borderRadius: 12, padding: 10 },
    statusBannerText: { fontWeight: '700', textAlign: 'center', fontSize: 13 },

    statsRow: { flexDirection: 'row', gap: 10 },

    trendsBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 18, padding: 16,
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    trendsBtnTitle: { fontSize: 14, fontWeight: '700' },
    trendsBtnSub: { fontSize: 11, marginTop: 2 },

    tipsCard: { borderRadius: 18, padding: 16, gap: 5 },
    tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    tipsTitle: { fontSize: 13, fontWeight: '700' },
    tipRow: { flexDirection: 'row', gap: 8 },
    tipDot: { fontSize: 14, lineHeight: 20 },
    tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
  });
}
