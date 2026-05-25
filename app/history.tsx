import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, AppColors, Gradients } from '../constants/colors';
import { getShoppingLists, setActiveList } from '../lib/queries';
import { eurToBgn, formatPrice, formatEur } from '../lib/currency';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import type { ShoppingList } from '../types';

function computeTotal(list: ShoppingList): number {
  return (list.items ?? []).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
}

export default function HistoryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

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

  const handleActivate = async (list: ShoppingList) => {
    if (list.is_active) return;
    Alert.alert(
      'Активирай списък',
      `Искаш ли „${list.name}" да стане активният списък?`,
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Активирай',
          onPress: async () => {
            setActivating(list.id);
            try {
              await setActiveList(list.id);
              setLists((prev) =>
                prev.map((l) => ({ ...l, is_active: l.id === list.id }))
              );
            } catch {
              Alert.alert('Грешка', 'Не можа да се смени активният списък.');
            } finally {
              setActivating(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item: list, index }: { item: ShoppingList; index: number }) => {
    const budgetBgn = eurToBgn(list.budget_eur);
    const total = computeTotal(list);
    const checkedCount = (list.items ?? []).filter((i) => i.is_checked).length;
    const totalCount = (list.items ?? []).length;
    const progress = budgetBgn > 0 ? Math.min(total / budgetBgn, 1) : 0;
    const isOver = total > budgetBgn;
    const barColor = isOver ? c.bad : progress > 0.8 ? c.warn : c.good;
    const isActivating = activating === list.id;
    const date = new Date(list.created_at).toLocaleDateString('bg-BG', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
      <View style={[styles.card, list.is_active && styles.cardActive]}>
        {/* Active badge */}
        {list.is_active && (
          <View style={styles.activeBadgeRow}>
            <LinearGradient colors={Gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeBadge}>
              <CheckIcon size={11} color="#fff" />
              <Text style={styles.activeBadgeText}>Активен</Text>
            </LinearGradient>
          </View>
        )}

        {/* List name + date */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.listName}>{list.name}</Text>
            <Text style={styles.listDate}>{date}</Text>
          </View>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>{totalCount} продукта</Text>
          </View>
        </View>

        {/* Budget + total */}
        <View style={styles.amountsRow}>
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Бюджет</Text>
            <Text style={styles.amountValue}>{formatEur(list.budget_eur)}</Text>
            <Text style={styles.amountSub}>{formatPrice(budgetBgn)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Похарчено</Text>
            <Text style={[styles.amountValue, { color: isOver ? c.bad : c.good }]}>{formatPrice(total)}</Text>
            <Text style={styles.amountSub}>{checkedCount}/{totalCount} купени</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Остатък</Text>
            <Text style={[styles.amountValue, { color: isOver ? c.bad : c.good }]}>
              {isOver ? `-${formatPrice(total - budgetBgn)}` : formatPrice(budgetBgn - total)}
            </Text>
            <Text style={styles.amountSub}>{Math.round(progress * 100)}% изразходвано</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: barColor }]} />
        </View>

        {/* Activate button */}
        {!list.is_active && (
          <TouchableOpacity
            style={[styles.activateBtn, isActivating && { opacity: 0.5 }]}
            onPress={() => handleActivate(list)}
            disabled={!!activating}
          >
            <Text style={styles.activateBtnText}>
              {isActivating ? 'Активирам...' : 'Активирай'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color={c.ink} />
        </TouchableOpacity>
        <View>
          <Text style={styles.navTitle}>История</Text>
          <Text style={styles.navSub}>Всички ваши списъци</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📂</Text>
              <Text style={styles.emptyTitle}>Няма списъци</Text>
              <Text style={styles.emptyHint}>Създай списък в таб „Списък"</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    navBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.canvas,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    navTitle: { fontSize: 20, fontWeight: '800', color: c.ink, letterSpacing: -0.5, textAlign: 'center' },
    navSub: { fontSize: 11, color: c.inkSoft, textAlign: 'center' },

    list: { padding: 16, gap: 14, paddingBottom: 40 },

    card: {
      backgroundColor: c.surface, borderRadius: 20, padding: 16,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
      gap: 12,
    },
    cardActive: { borderWidth: 2, borderColor: c.accentSoft },

    activeBadgeRow: { flexDirection: 'row' },
    activeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    },
    activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    cardTitleWrap: { flex: 1 },
    listName: { fontSize: 16, fontWeight: '800', color: c.ink, letterSpacing: -0.3 },
    listDate: { fontSize: 11, color: c.inkFaint, marginTop: 2 },
    itemCountBadge: { backgroundColor: c.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    itemCountText: { fontSize: 11, fontWeight: '600', color: c.inkSoft },

    amountsRow: { flexDirection: 'row', alignItems: 'center' },
    amountBlock: { flex: 1, alignItems: 'center', gap: 2 },
    amountLabel: { fontSize: 10, fontWeight: '600', color: c.inkFaint, textTransform: 'uppercase', letterSpacing: 0.3 },
    amountValue: { fontSize: 15, fontWeight: '800', color: c.ink },
    amountSub: { fontSize: 9, color: c.inkFaint },
    amountDivider: { width: 1, height: 32, backgroundColor: c.divider, marginHorizontal: 8 },

    progressBg: { height: 5, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },

    activateBtn: {
      alignSelf: 'center', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 24,
      borderWidth: 1.5, borderColor: c.accent,
    },
    activateBtnText: { color: c.accent, fontWeight: '700', fontSize: 13 },

    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyEmoji: { fontSize: 44 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.ink },
    emptyHint: { fontSize: 14, color: c.inkSoft, textAlign: 'center' },
  });
}
