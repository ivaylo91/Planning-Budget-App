import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { getActiveShoppingList, updateBudget } from '../../lib/queries';
import { eurToBgn, formatPrice, formatEur, bgnToEur } from '../../lib/currency';
import type { ShoppingList } from '../../types';

export default function BudgetScreen() {
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

  useEffect(() => { load(); }, [load]);

  const items = list?.items ?? [];
  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const totalInList = items.reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const totalBought = items.filter((i) => i.is_checked).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const remaining = budgetBgn - totalInList;
  const progress = budgetBgn > 0 ? Math.min(totalInList / budgetBgn, 1) : 0;
  const isOver = totalInList > budgetBgn;
  const barColor = isOver ? Colors.bad : progress > 0.8 ? Colors.warn : Colors.good;

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
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.accent} />}
    >
      {/* Main budget card */}
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
              placeholderTextColor={Colors.inkFaint}
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
          <TouchableOpacity
            onPress={() => { setBudgetInput(list.budget_eur.toString()); setEditingBudget(true); }}
          >
            <Text style={styles.budgetEur}>{formatEur(list.budget_eur)}</Text>
            <Text style={styles.budgetBgn}>{formatPrice(budgetBgn)}</Text>
            <Text style={styles.editHint}>Натисни за промяна</Text>
          </TouchableOpacity>
        )}

        {/* Progress bar */}
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

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="В списъка" value={formatPrice(totalInList)} emoji="🛒" color={Colors.accent} />
        <StatCard label="Купено" value={formatPrice(totalBought)} emoji="✅" color={Colors.good} />
        <StatCard label="Продукти" value={String(items.length)} emoji="📦" color={Colors.warn} />
      </View>

      {/* Store breakdown */}
      {items.length > 0 && <StoreBreakdown items={items} />}

      {/* Tips */}
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

function StatCard({ label, value, emoji, color }: { label: string; value: string; emoji: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StoreBreakdown({ items }: { items: any[] }) {
  const byStore: Record<string, { name: string; total: number; color: string }> = {};
  items.forEach((item) => {
    if (!item.store_id || !item.price_at_add) return;
    const slug = item.store?.slug ?? '';
    if (!byStore[item.store_id]) byStore[item.store_id] = {
      name: item.store?.name ?? 'Неизвестен',
      total: 0,
      color: Colors.stores[slug as keyof typeof Colors.stores] ?? Colors.accent,
    };
    byStore[item.store_id].total += item.price_at_add * item.quantity;
  });
  const entries = Object.values(byStore).sort((a, b) => b.total - a.total);
  if (!entries.length) return null;
  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownTitle}>По магазин</Text>
      {entries.map((e) => (
        <View key={e.name} style={styles.breakdownRow}>
          <View style={[styles.storeDot, { backgroundColor: e.color }]} />
          <Text style={styles.breakdownStore}>{e.name}</Text>
          <Text style={[styles.breakdownAmt, { color: e.color }]}>{formatPrice(e.total)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center', lineHeight: 20 },

  mainCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 22,
    shadowColor: '#2b1d12', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  listName: { fontSize: 12, color: Colors.inkSoft, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 },
  budgetEur: { fontSize: 40, fontWeight: '800', color: Colors.ink, letterSpacing: -1 },
  budgetBgn: { fontSize: 18, color: Colors.inkSoft, marginTop: 2 },
  editHint: { fontSize: 11, color: Colors.inkFaint, marginTop: 6 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  budgetInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.accent, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 22, fontWeight: '700', color: Colors.ink,
  },
  currencyLabel: { fontSize: 20, fontWeight: '700', color: Colors.inkSoft },
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: 10,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cancelBtn: {
    borderWidth: 1, borderColor: 'rgba(43,29,18,0.12)', borderRadius: 10,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: Colors.inkSoft, fontWeight: '700', fontSize: 16 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 10 },
  progressBg: { flex: 1, height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressPct: { fontWeight: '700', fontSize: 13, minWidth: 38, textAlign: 'right' },

  overBanner: {
    backgroundColor: 'rgba(168,65,42,0.10)', borderRadius: 10, padding: 10,
  },
  overText: { color: Colors.bad, fontWeight: '700', textAlign: 'center', fontSize: 14 },
  remainingText: { fontSize: 13, color: Colors.inkSoft, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#2b1d12', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.inkSoft, marginTop: 3, textAlign: 'center' },

  breakdownCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#2b1d12', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  breakdownTitle: { fontSize: 13, fontWeight: '700', color: Colors.ink, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  storeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  breakdownStore: { flex: 1, fontSize: 14, color: Colors.ink },
  breakdownAmt: { fontSize: 14, fontWeight: '700' },

  tipsCard: { backgroundColor: Colors.accentSoft, borderRadius: 16, padding: 16, gap: 6 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: Colors.accent, marginBottom: 4 },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipDot: { fontSize: 14, color: Colors.accent, lineHeight: 20 },
  tipText: { flex: 1, fontSize: 13, color: Colors.ink, lineHeight: 20 },
});
