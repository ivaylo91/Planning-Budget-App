import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, RefreshControl, Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors } from '../../constants/colors';
import {
  getActiveShoppingList, addItemToList, toggleItemChecked,
  removeItemFromList, createShoppingList, updateItemQuantity,
} from '../../lib/queries';
import { formatPrice, eurToBgn, formatEur } from '../../lib/currency';
import { notifyOverBudget } from '../../lib/notifications';
import { FilterIcon, PlusIcon, TrashIcon, CheckIcon } from '../../components/Icons';
import { FLOATING_TAB_HEIGHT } from '../../components/FloatingTabBar';
import type { ShoppingList, ListItem } from '../../types';

const FILTER_OPTIONS = ['Всички', 'Активни', 'Купени'];

export default function ListScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newBudget, setNewBudget] = useState('100');
  const [filter, setFilter] = useState(0);

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

  const allItems = list?.items ?? [];
  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const totalSpent = allItems.filter((i) => !i.is_checked).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const checkedCount = allItems.filter((i) => i.is_checked).length;
  const progress = budgetBgn > 0 ? Math.min(totalSpent / budgetBgn, 1) : 0;
  const isOver = totalSpent > budgetBgn;
  const barColor = isOver ? c.bad : progress > 0.8 ? c.warn : c.good;

  const filteredItems = filter === 1
    ? allItems.filter((i) => !i.is_checked)
    : filter === 2
    ? allItems.filter((i) => i.is_checked)
    : [...allItems.filter((i) => !i.is_checked), ...allItems.filter((i) => i.is_checked)];

  const checkOverBudget = useCallback((items: ListItem[], budget: number, name: string) => {
    const total = items.filter((i) => !i.is_checked).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
    if (total > budget) notifyOverBudget(total - budget, name);
  }, []);

  const handleAddItem = async () => {
    if (!list || newItem.trim().length < 2) return;
    setAdding(true);
    try {
      const item = await addItemToList(list.id, newItem.trim(), null);
      const newItems = [...(list.items ?? []), item];
      setList((prev) => prev ? { ...prev, items: newItems } : prev);
      checkOverBudget(newItems, eurToBgn(list.budget_eur), list.name);
      setNewItem('');
    } catch {
      Alert.alert('Грешка', 'Не можа да се добави продуктът.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: ListItem) => {
    try {
      const newChecked = !item.is_checked;
      await toggleItemChecked(item.id, newChecked);
      setList((prev) => {
        if (!prev) return prev;
        const newItems = prev.items?.map((i) => i.id === item.id ? { ...i, is_checked: newChecked } : i) ?? [];
        if (!newChecked) checkOverBudget(newItems, eurToBgn(prev.budget_eur), prev.name);
        return { ...prev, items: newItems };
      });
    } catch { /* silent */ }
  };

  const handleRemove = (item: ListItem) => {
    Alert.alert('Изтрий', `Изтрий „${item.product_name}"?`, [
      { text: 'Отказ', style: 'cancel' },
      {
        text: 'Изтрий', style: 'destructive',
        onPress: async () => {
          await removeItemFromList(item.id);
          setList((prev) => prev ? { ...prev, items: prev.items?.filter((i) => i.id !== item.id) } : prev);
        },
      },
    ]);
  };

  const handleQuantityChange = async (item: ListItem, delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    if (newQty === item.quantity) return;
    setList((prev) => {
      if (!prev) return prev;
      const newItems = prev.items?.map((i) => i.id === item.id ? { ...i, quantity: newQty } : i) ?? [];
      checkOverBudget(newItems, eurToBgn(prev.budget_eur), prev.name);
      return { ...prev, items: newItems };
    });
    try {
      await updateItemQuantity(item.id, newQty);
    } catch {
      // revert on failure
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items?.map((i) => i.id === item.id ? { ...i, quantity: item.quantity } : i) };
      });
    }
  };

  const handleCreateList = async () => {
    const budget = parseFloat(newBudget);
    if (isNaN(budget) || budget <= 0) { Alert.alert('Грешка', 'Въведи валиден бюджет.'); return; }
    try {
      const created = await createShoppingList(newListName.trim() || 'Моят списък', budget);
      setList({ ...created, items: [] });
      setShowNewList(false);
      setNewListName('');
    } catch {
      Alert.alert('Грешка', 'Не можа да се създаде списъкът.');
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => (
    <SwipeableItem
      item={item}
      c={c}
      onToggle={handleToggle}
      onRemove={handleRemove}
      onQuantityChange={handleQuantityChange}
    />
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={c.accent} /></View>;
  }

  if (!list) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>Нямаш списък</Text>
        <Text style={styles.emptyHint}>Създай списък и започни да пазаруваш умно</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewList(true)}>
          <Text style={styles.createBtnText}>+ Нов списък</Text>
        </TouchableOpacity>
        <NewListModal
          visible={showNewList} name={newListName} budget={newBudget} colors={c}
          onChangeName={setNewListName} onChangeBudget={setNewBudget}
          onConfirm={handleCreateList} onClose={() => setShowNewList(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{list.name}</Text>
          <Text style={styles.headerSub}>Бюджет {formatEur(list.budget_eur)} · {formatPrice(budgetBgn)}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.progressChip, { backgroundColor: isOver ? '#ffdad3' : c.accentSoft }]}>
            <Text style={[styles.progressChipText, { color: isOver ? c.bad : c.accent }]}>
              {checkedCount}/{allItems.length}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.historyBtnText}>История</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowNewList(true)}>
            <FilterIcon size={17} color={c.inkSoft} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: barColor }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressSpent, { color: isOver ? c.bad : c.ink }]}>{formatPrice(totalSpent)}</Text>
          <Text style={[styles.progressRem, { color: barColor }]}>
            {isOver ? `+${formatPrice(totalSpent - budgetBgn)} над` : `${formatPrice(budgetBgn - totalSpent)} остава`}
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={opt}
            style={[styles.filterChip, filter === i && { backgroundColor: c.accent, borderColor: c.accent }]}
            onPress={() => setFilter(i)}
          >
            <Text style={[styles.filterChipText, filter === i && { color: '#fff' }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add row */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Добави продукт..."
          placeholderTextColor={c.inkFaint}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newItem.trim() || adding) && styles.addBtnDisabled]}
          onPress={handleAddItem}
          disabled={!newItem.trim() || adding}
        >
          {adding ? <Text style={styles.addBtnText}>…</Text> : <PlusIcon size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: FLOATING_TAB_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyHint}>Списъкът е празен — добави продукти по-горе</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.newListBtn} onPress={() => setShowNewList(true)}>
            <Text style={styles.newListBtnText}>+ Нов списък</Text>
          </TouchableOpacity>
        }
      />

      <NewListModal
        visible={showNewList} name={newListName} budget={newBudget} colors={c}
        onChangeName={setNewListName} onChangeBudget={setNewBudget}
        onConfirm={handleCreateList} onClose={() => setShowNewList(false)}
      />
    </View>
  );
}

function SwipeableItem({
  item, c, onToggle, onRemove, onQuantityChange,
}: {
  item: ListItem;
  c: AppColors;
  onToggle: (i: ListItem) => void;
  onRemove: (i: ListItem) => void;
  onQuantityChange: (i: ListItem, delta: number) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);

  const toggleSwipe = () => {
    const toValue = swiped ? 0 : -84;
    Animated.spring(translateX, { toValue, useNativeDriver: true, tension: 100, friction: 12 }).start();
    setSwiped(!swiped);
  };

  const hasPrice = item.price_at_add !== null;
  const totalLine = hasPrice ? formatPrice(item.price_at_add! * item.quantity) : null;

  return (
    <View style={{ overflow: 'hidden', borderRadius: 16, marginBottom: 8 }}>
      {/* Delete reveal */}
      <View style={[{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 84, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bad, borderRadius: 16 }]}>
        <TouchableOpacity
          onPress={() => onRemove(item)}
          style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <TrashIcon size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 3 }}>Изтрий</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: c.surface, borderRadius: 16, padding: 14,
            shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 }, elevation: 1,
          }, item.is_checked && { opacity: 0.45 }]}
          onPress={() => { if (swiped) { toggleSwipe(); } else { onToggle(item); } }}
          onLongPress={toggleSwipe}
          activeOpacity={0.7}
        >
          {/* Checkbox */}
          <TouchableOpacity
            style={[{
              width: 26, height: 26, borderRadius: 13, borderWidth: 2,
              alignItems: 'center', justifyContent: 'center', marginRight: 12,
              borderColor: item.is_checked ? c.good : c.surfaceAlt,
            }, item.is_checked && { backgroundColor: c.good }]}
            onPress={() => onToggle(item)}
          >
            {item.is_checked && <CheckIcon size={13} color="#fff" strokeWidth={3} />}
          </TouchableOpacity>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15, fontWeight: '500',
                color: item.is_checked ? c.inkFaint : c.ink,
                textDecorationLine: item.is_checked ? 'line-through' : 'none',
              }}
              numberOfLines={1}
            >
              {item.product_name}
            </Text>

            {/* Store + quantity row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 }}>
              {item.store && (
                <Text style={{ fontSize: 11, color: c.inkFaint }}>{item.store.name}</Text>
              )}
              {hasPrice && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <TouchableOpacity
                    style={[qtyStyles.btn, { backgroundColor: c.surfaceAlt, opacity: item.quantity <= 1 ? 0.4 : 1 }]}
                    onPress={() => onQuantityChange(item, -1)}
                    disabled={item.quantity <= 1 || item.is_checked}
                  >
                    <Text style={[qtyStyles.btnText, { color: c.ink }]}>−</Text>
                  </TouchableOpacity>
                  <View style={qtyStyles.countWrap}>
                    <Text style={[qtyStyles.countText, { color: c.ink }]}>{item.quantity}</Text>
                  </View>
                  <TouchableOpacity
                    style={[qtyStyles.btn, { backgroundColor: c.surfaceAlt, opacity: item.is_checked ? 0.4 : 1 }]}
                    onPress={() => onQuantityChange(item, 1)}
                    disabled={item.is_checked}
                  >
                    <Text style={[qtyStyles.btnText, { color: c.ink }]}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Price */}
          {totalLine && (
            <Text style={{ fontSize: 13, fontWeight: '700', color: item.is_checked ? c.inkFaint : c.accent, marginLeft: 8 }}>
              {totalLine}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const qtyStyles = StyleSheet.create({
  btn: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  countWrap: { minWidth: 22, alignItems: 'center' },
  countText: { fontSize: 13, fontWeight: '700' },
});

function NewListModal({ visible, name, budget, colors: c, onChangeName, onChangeBudget, onConfirm, onClose }: {
  visible: boolean; name: string; budget: string; colors: AppColors;
  onChangeName: (v: string) => void; onChangeBudget: (v: string) => void;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 28, padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: c.ink, marginBottom: 18 }}>Нов списък</Text>
          <TextInput
            style={{ borderWidth: 1.5, borderColor: c.divider, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.ink, marginBottom: 12, backgroundColor: c.canvas }}
            placeholder="Название (напр. Седмично)" value={name}
            onChangeText={onChangeName} placeholderTextColor={c.inkFaint}
          />
          <TextInput
            style={{ borderWidth: 1.5, borderColor: c.divider, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.ink, marginBottom: 18, backgroundColor: c.canvas }}
            placeholder="Бюджет в евро (напр. 100)" value={budget}
            onChangeText={onChangeBudget} keyboardType="numeric" placeholderTextColor={c.inkFaint}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.surfaceAlt }} onPress={onClose}>
              <Text style={{ color: c.inkSoft, fontWeight: '700', fontSize: 15 }}>Отказ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.accent }} onPress={onConfirm}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Създай</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.ink, marginBottom: 6 },
    emptyHint: { fontSize: 14, color: c.inkSoft, textAlign: 'center', lineHeight: 20 },
    createBtn: { marginTop: 20, backgroundColor: c.accent, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    header: {
      backgroundColor: c.surface, flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 12,
    },
    headerLeft: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: c.ink, letterSpacing: -0.5 },
    headerSub: { fontSize: 11, color: c.inkSoft, marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    progressChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    progressChipText: { fontSize: 12, fontWeight: '800' },
    historyBtn: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: c.surfaceAlt },
    historyBtnText: { fontSize: 11, fontWeight: '700', color: c.inkSoft },
    filterBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

    progressWrap: { backgroundColor: c.surface, paddingHorizontal: 16, paddingBottom: 12 },
    progressBg: { height: 6, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', borderRadius: 999 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    progressSpent: { fontSize: 13, fontWeight: '700' },
    progressRem: { fontSize: 11, fontWeight: '600' },

    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider },
    filterChipText: { fontSize: 12, fontWeight: '600', color: c.inkSoft },

    addRow: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 8, gap: 8, alignItems: 'center' },
    addInput: {
      flex: 1, backgroundColor: c.surface, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.ink,
      borderWidth: 1, borderColor: c.divider,
    },
    addBtn: { backgroundColor: c.accent, borderRadius: 14, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    addBtnDisabled: { opacity: 0.35 },
    addBtnText: { color: '#fff', fontSize: 22, fontWeight: '300' },

    list: { paddingHorizontal: 14 },
    emptyList: { alignItems: 'center', paddingTop: 40, gap: 8 },
    newListBtn: { alignSelf: 'center', marginTop: 20, marginBottom: 4, paddingVertical: 11, paddingHorizontal: 24, borderRadius: 999, borderWidth: 1.5, borderColor: c.accent },
    newListBtnText: { color: c.accent, fontWeight: '700', fontSize: 13 },
  });
}
