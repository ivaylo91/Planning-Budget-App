import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors, Gradients } from '../constants/colors';
import { getActiveShoppingList, toggleItemChecked } from '../lib/queries';
import { formatPrice, eurToBgn } from '../lib/currency';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { StoreIcon } from '../components/StoreIcon';
import type { ListItem, ShoppingList } from '../types';

export default function ShoppingScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveShoppingList()
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (item: ListItem) => {
    const newChecked = !item.is_checked;
    // Optimistic update
    setList((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items?.map((i) => i.id === item.id ? { ...i, is_checked: newChecked } : i) };
    });
    try {
      await toggleItemChecked(item.id, newChecked);
    } catch {
      // Revert on failure
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items?.map((i) => i.id === item.id ? { ...i, is_checked: item.is_checked } : i) };
      });
    }
  }, []);

  const handleFinish = () => {
    const all = list?.items ?? [];
    const remaining = all.filter((i) => !i.is_checked).length;
    if (remaining > 0) {
      Alert.alert(
        'Завърши пазаруването',
        `Все още имаш ${remaining} непотвърден${remaining === 1 ? '' : 'и'} ${remaining === 1 ? 'продукт' : 'продукта'}. Сигурен ли си?`,
        [
          { text: 'Не', style: 'cancel' },
          { text: 'Завърши', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.canvas }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const items = list?.items ?? [];
  const unchecked = items.filter((i) => !i.is_checked);
  const checked = items.filter((i) => i.is_checked);
  const total = checked.reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const progress = budgetBgn > 0 ? Math.min(total / budgetBgn, 1) : 0;
  const isOver = total > budgetBgn;
  const barColor = isOver ? c.bad : progress > 0.8 ? c.warn : c.good;

  const sections = [
    ...(unchecked.length > 0 ? [{ title: `Нужно (${unchecked.length})`, data: unchecked, done: false }] : []),
    ...(checked.length > 0 ? [{ title: `В кошницата (${checked.length})`, data: checked, done: true }] : []),
  ];

  const allDone = unchecked.length === 0 && items.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      {/* Header */}
      <LinearGradient
        colors={allDone ? Gradients.good : Gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {allDone ? '🎉 Готово!' : '🛒 Пазаруване'}
          </Text>
          <Text style={styles.headerSub}>
            {list?.name ?? 'Списък'} · {checked.length}/{items.length} продукта
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Cart summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: c.surface }]}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>В кошницата</Text>
          <Text style={[styles.summaryTotal, { color: isOver ? c.bad : c.ink }]}>
            {formatPrice(total)}
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <View style={[styles.progressBarBg, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: barColor }]} />
          </View>
          <Text style={[styles.summaryBudget, { color: barColor }]}>
            {isOver
              ? `+${formatPrice(total - budgetBgn)} над бюджета`
              : `${formatPrice(budgetBgn - total)} остава`}
          </Text>
        </View>
      </View>

      {/* Items */}
      {items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={[styles.emptyText, { color: c.inkSoft }]}>Списъкът е празен</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: c.canvas }]}>
              <Text style={[styles.sectionTitle, { color: section.done ? c.good : c.ink }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => (
            <ShoppingItem
              item={item}
              c={c}
              done={section.done}
              onToggle={handleToggle}
            />
          )}
        />
      )}

      {/* Bottom CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleFinish} activeOpacity={0.85}>
          <LinearGradient
            colors={allDone ? Gradients.good : Gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.finishBtn}
          >
            <Text style={styles.finishText}>
              {allDone ? 'Пазаруването е завършено ✓' : 'Завърши пазаруването'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ShoppingItem({
  item, c, done, onToggle,
}: {
  item: ListItem;
  c: AppColors;
  done: boolean;
  onToggle: (i: ListItem) => void;
}) {
  const hasPrice = item.price_at_add !== null;

  return (
    <TouchableOpacity
      style={[styles2.card, { backgroundColor: c.surface }, done && styles2.cardDone]}
      onPress={() => onToggle(item)}
      activeOpacity={0.72}
    >
      {/* Checkbox */}
      <View style={[styles2.checkbox, { borderColor: done ? c.good : c.divider }, done && { backgroundColor: c.good }]}>
        {done && <CheckIcon size={15} color="#fff" />}
      </View>

      {/* Info */}
      <View style={styles2.info}>
        <Text
          style={[styles2.name, { color: done ? c.inkFaint : c.ink }]}
          numberOfLines={1}
        >
          {item.product_name}
        </Text>
        <View style={styles2.meta}>
          {item.store && (
            <>
              <StoreIcon slug={item.store.slug} size={16} />
              <Text style={[styles2.storeName, { color: c.inkFaint }]}>{item.store.name}</Text>
            </>
          )}
          {item.quantity > 1 && (
            <View style={[styles2.qtyBadge, { backgroundColor: c.accentSoft }]}>
              <Text style={[styles2.qtyText, { color: c.accent }]}>×{item.quantity}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Price */}
      {hasPrice && (
        <Text style={[styles2.price, { color: done ? c.inkFaint : c.accent }]}>
          {formatPrice(item.price_at_add! * item.quantity)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles2 = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, marginHorizontal: 14, marginBottom: 8, borderRadius: 18,
    shadowColor: '#3a2415', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    minHeight: 68,
  },
  cardDone: { opacity: 0.55 },
  checkbox: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 12, fontWeight: '500' },
  qtyBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  qtyText: { fontSize: 11, fontWeight: '800' },
  price: { fontSize: 15, fontWeight: '800', flexShrink: 0 },
});

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyEmoji: { fontSize: 44, marginBottom: 8 },
    emptyText: { fontSize: 16, fontWeight: '500' },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 18, gap: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '500' },

    summaryBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14, gap: 16,
      shadowColor: '#3a2415', shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    summaryLeft: { gap: 2 },
    summaryLabel: { fontSize: 10, fontWeight: '600', color: c.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryTotal: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
    summaryRight: { flex: 1, gap: 4 },
    progressBarBg: { height: 6, borderRadius: 999, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 999 },
    summaryBudget: { fontSize: 11, fontWeight: '600' },

    list: { paddingTop: 8 },
    sectionHeader: { paddingHorizontal: 14, paddingVertical: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },

    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 16, paddingTop: 12,
      backgroundColor: c.canvas,
      borderTopWidth: 1, borderTopColor: c.divider,
    },
    finishBtn: { borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
    finishText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
