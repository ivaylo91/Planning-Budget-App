import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColors, AppColors } from '../../constants/colors';
import { getActiveShoppingList, updateBudget } from '../../lib/queries';
import { eurToBgn, formatPrice, formatEur, bgnToEur } from '../../lib/currency';
import type { ShoppingList } from '../../types';

export default function BudgetScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
    >
      <View style={styles.mainCard}>
        <Text style={styles.listName}>{list.name}</Text>

        {editingBudget ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.budgetInput}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="Бюджет в EUR"
              autoFocus
              placeholderTextColor={c.inkFaint}
            />
            <Text style={styles.currencyLabel}>€</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
              <Text style={styles.saveBtnText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingBudget(false)}>
              <Text style={styles.cancelBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setBudgetInput(list.budget_eur.toString()); setEditingBudget(true); }}>
            <Text style={styles.budgetEur}>{formatEur(list.budget_eur)}</Text>
            <Text style={styles.budgetBgn}>{formatPrice(budgetBgn)}</Text>
            <Text style={styles.editHint}>Натисни за промяна</Text>
          </TouchableOpacity>
        )}

        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: barColor }]} />
          </View>
          <Text style={[styles.progressPct, { color: barColor }]}>{Math.round(progress * 100)}%</Text>
        </View>

        {isOver ? (
          <View style={styles.overBanner}>
            <Text style={styles.overText}>⚠️ Надвишен с {formatPrice(Math.abs(remaining))}!</Text>
          </View>
        ) : (
          <Text style={styles.remainingText}>
            Остават {formatPrice(remaining)} · {formatEur(bgnToEur(remaining))}
          </Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatCard label="В списъка" value={formatPrice(totalInList)} emoji="🛒" color={c.accent} c={c} />
        <StatCard label="Купено" value={formatPrice(totalBought)} emoji="✅" color={c.good} c={c} />
        <StatCard label="Продукти" value={String(items.length)} emoji="📦" color={c.warn} c={c} />
      </View>

      {items.length > 0 && <StoreBreakdown items={items} c={c} />}

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Съвети за спестяване</Text>
        {[
          'Задръж продукт в списъка за изтриване',
          'Сравни цени преди да пазаруваш',
          '1 € = 1.95583 лв. (фиксиран курс)',
          'Провери промоциите в таб Промоции',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipDot}>·</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, emoji, color, c }: { label: string; value: string; emoji: string; color: string; c: AppColors }) {
  return (
    <View style={[{ flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderTopWidth: 3, borderTopColor: color, shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }]}>
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
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.ink, marginBottom: 12 }}>По магазин</Text>
      {entries.map((e) => (
        <View key={e.name} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: e.color, marginRight: 10 }} />
          <Text style={{ flex: 1, fontSize: 14, color: c.ink }}>{e.name}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: e.color }}>{formatPrice(e.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    content: { padding: 16, paddingBottom: 32, gap: 14 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.ink, marginBottom: 6 },
    emptyHint: { fontSize: 14, color: c.inkSoft, textAlign: 'center', lineHeight: 20 },

    mainCard: {
      backgroundColor: c.surface, borderRadius: 24, padding: 22,
      shadowColor: c.shadow, shadowOpacity: 0.07, shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 }, elevation: 3,
    },
    listName: { fontSize: 12, color: c.inkSoft, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 },
    budgetEur: { fontSize: 40, fontWeight: '800', color: c.ink, letterSpacing: -1 },
    budgetBgn: { fontSize: 18, color: c.inkSoft, marginTop: 2 },
    editHint: { fontSize: 11, color: c.inkFaint, marginTop: 6 },
    editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    budgetInput: {
      flex: 1, borderWidth: 1.5, borderColor: c.accent, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 22, fontWeight: '700', color: c.ink,
    },
    currencyLabel: { fontSize: 20, fontWeight: '700', color: c.inkSoft },
    saveBtn: { backgroundColor: c.accent, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
    cancelBtn: { borderWidth: 1, borderColor: c.divider, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { color: c.inkSoft, fontWeight: '700', fontSize: 16 },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 10 },
    progressBg: { flex: 1, height: 8, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    progressPct: { fontWeight: '700', fontSize: 13, minWidth: 38, textAlign: 'right' },

    overBanner: { backgroundColor: c.accentSoft, borderRadius: 10, padding: 10 },
    overText: { color: c.bad, fontWeight: '700', textAlign: 'center', fontSize: 14 },
    remainingText: { fontSize: 13, color: c.inkSoft, textAlign: 'center' },

    statsRow: { flexDirection: 'row', gap: 10 },

    tipsCard: { backgroundColor: c.accentSoft, borderRadius: 16, padding: 16, gap: 6 },
    tipsTitle: { fontSize: 13, fontWeight: '700', color: c.accent, marginBottom: 4 },
    tipRow: { flexDirection: 'row', gap: 8 },
    tipDot: { fontSize: 14, color: c.accent, lineHeight: 20 },
    tipText: { flex: 1, fontSize: 13, color: c.ink, lineHeight: 20 },
  });
}
