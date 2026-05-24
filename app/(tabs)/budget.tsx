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

  const totalInList = items.reduce(
    (sum, i) => sum + (i.price_at_add ?? 0) * i.quantity, 0
  );
  const totalBought = items
    .filter((i) => i.is_checked)
    .reduce((sum, i) => sum + (i.price_at_add ?? 0) * i.quantity, 0);
  const remaining = budgetBgn - totalInList;
  const progress = budgetBgn > 0 ? Math.min(totalInList / budgetBgn, 1) : 0;
  const isOver = totalInList > budgetBgn;

  const handleSaveBudget = async () => {
    if (!list) return;
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Грешка', 'Въведи валидна стойност.');
      return;
    }
    try {
      await updateBudget(list.id, val);
      setList((prev) => prev ? { ...prev, budget_eur: val } : prev);
      setEditingBudget(false);
    } catch {
      Alert.alert('Грешка', 'Не можа да се актуализира бюджетът.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>💰</Text>
        <Text style={styles.emptyText}>Нямаш активен списък.{'\n'}Създай списък в таб „Списък".</Text>
      </View>
    );
  }

  const barColor = isOver ? Colors.error : progress > 0.8 ? Colors.warning : Colors.primary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
      }
    >
      {/* Main budget card */}
      <View style={[styles.mainCard, { borderColor: barColor }]}>
        <Text style={styles.listName}>{list.name}</Text>

        {/* Budget edit */}
        {editingBudget ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.budgetInput}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="Бюджет в EUR"
              autoFocus
              placeholderTextColor={Colors.textSecondary}
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
            style={styles.budgetDisplay}
            onPress={() => {
              setBudgetInput(list.budget_eur.toString());
              setEditingBudget(true);
            }}
          >
            <Text style={styles.budgetEur}>{formatEur(list.budget_eur)}</Text>
            <Text style={styles.budgetBgn}>{formatPrice(budgetBgn)}</Text>
            <Text style={styles.editHint}>✏️ Натисни за редакция</Text>
          </TouchableOpacity>
        )}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
          <Text style={[styles.progressPct, { color: barColor }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {isOver ? (
          <View style={styles.overBanner}>
            <Text style={styles.overText}>
              ⚠️ Надвишен бюджет с {formatPrice(Math.abs(remaining))}!
            </Text>
          </View>
        ) : (
          <Text style={styles.remainingText}>
            Остават {formatPrice(remaining)} ({formatEur(bgnToEur(remaining))})
          </Text>
        )}
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <StatCard label="В списъка" value={formatPrice(totalInList)} icon="🛒" color={Colors.primary} />
        <StatCard label="Купено" value={formatPrice(totalBought)} icon="✅" color={Colors.success} />
        <StatCard label="Продукти" value={`${items.length}`} icon="📦" color={Colors.accent} />
      </View>

      {/* Store breakdown */}
      {items.length > 0 && <StoreBreakdown items={items} />}

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Съвети</Text>
        <Text style={styles.tip}>• Задръж върху продукт в списъка за изтриване</Text>
        <Text style={styles.tip}>• Натисни продукт за да го маркираш като купен</Text>
        <Text style={styles.tip}>• 1 € = 1.95583 лв. (фиксиран курс)</Text>
        <Text style={styles.tip}>• Сравни цените в Търсене преди да купуваш</Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StoreBreakdown({ items }: { items: any[] }) {
  const byStore: Record<string, { name: string; total: number; color: string }> = {};

  items.forEach((item) => {
    if (!item.store_id || !item.price_at_add) return;
    const storeName = item.store?.name ?? 'Неизвестен';
    const slug = item.store?.slug ?? '';
    if (!byStore[item.store_id]) {
      byStore[item.store_id] = {
        name: storeName,
        total: 0,
        color: Colors.stores[slug as keyof typeof Colors.stores] ?? Colors.primary,
      };
    }
    byStore[item.store_id].total += item.price_at_add * item.quantity;
  });

  const entries = Object.values(byStore).sort((a, b) => b.total - a.total);
  if (entries.length === 0) return null;

  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownTitle}>По магазин</Text>
      {entries.map((entry) => (
        <View key={entry.name} style={styles.breakdownRow}>
          <View style={[styles.storeDot, { backgroundColor: entry.color }]} />
          <Text style={styles.breakdownStore}>{entry.name}</Text>
          <Text style={[styles.breakdownAmount, { color: entry.color }]}>
            {formatPrice(entry.total)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  mainCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 16,
  },
  listName: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600', marginBottom: 12 },
  budgetDisplay: { marginBottom: 16 },
  budgetEur: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  budgetBgn: { fontSize: 18, color: Colors.textSecondary, marginTop: 2 },
  editHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  currencyLabel: { fontSize: 20, fontWeight: '700', color: Colors.textSecondary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 18 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressBg: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },
  progressPct: { fontWeight: '700', fontSize: 13, minWidth: 38, textAlign: 'right' },
  overBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  overText: { color: Colors.error, fontWeight: '700', textAlign: 'center' },
  remainingText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  storeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  breakdownStore: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  breakdownAmount: { fontSize: 14, fontWeight: '700' },
  tipsCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 10 },
  tip: { fontSize: 13, color: Colors.textPrimary, marginBottom: 6, lineHeight: 18 },
});
