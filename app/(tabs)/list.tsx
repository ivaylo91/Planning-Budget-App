import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, RefreshControl, Modal,
} from 'react-native';
import { Colors } from '../../constants/colors';
import {
  getActiveShoppingList, addItemToList, toggleItemChecked,
  removeItemFromList, createShoppingList,
} from '../../lib/queries';
import { formatPrice, eurToBgn, formatEur } from '../../lib/currency';
import { notifyOverBudget } from '../../lib/notifications';
import type { ShoppingList, ListItem } from '../../types';

export default function ListScreen() {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newBudget, setNewBudget] = useState('100');

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

  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const totalSpent = (list?.items ?? [])
    .filter((i) => !i.is_checked)
    .reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
  const progress = budgetBgn > 0 ? Math.min(totalSpent / budgetBgn, 1) : 0;
  const isOver = totalSpent > budgetBgn;

  const checkOverBudget = useCallback((items: ListItem[], budgetBgn: number, listName: string) => {
    const total = items.filter((i) => !i.is_checked).reduce((s, i) => s + (i.price_at_add ?? 0) * i.quantity, 0);
    if (total > budgetBgn) notifyOverBudget(total - budgetBgn, listName);
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

  const handleCreateList = async () => {
    const budget = parseFloat(newBudget);
    if (isNaN(budget) || budget <= 0) { Alert.alert('Грешка', 'Въведи валиден бюджет.'); return; }
    try {
      const created = await createShoppingList(newListName.trim() || 'Моят списък', budget);
      setList({ ...created, items: [] });
      setShowNewList(false);
    } catch {
      Alert.alert('Грешка', 'Не можа да се създаде списъкът.');
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => (
    <TouchableOpacity
      style={[styles.item, item.is_checked && styles.itemChecked]}
      onPress={() => handleToggle(item)}
      onLongPress={() => handleRemove(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemName, item.is_checked && styles.itemNameChecked]}>
          {item.product_name}
        </Text>
        {item.store && <Text style={styles.itemStore}>{item.store.name}</Text>}
      </View>
      {item.price_at_add ? (
        <Text style={[styles.itemPrice, item.is_checked && styles.itemPriceChecked]}>
          {formatPrice(item.price_at_add * item.quantity)}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;
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
          visible={showNewList} name={newListName} budget={newBudget}
          onChangeName={setNewListName} onChangeBudget={setNewBudget}
          onConfirm={handleCreateList} onClose={() => setShowNewList(false)}
        />
      </View>
    );
  }

  const unchecked = (list.items ?? []).filter((i) => !i.is_checked);
  const checked = (list.items ?? []).filter((i) => i.is_checked);
  const barColor = isOver ? Colors.bad : progress > 0.8 ? Colors.warn : Colors.good;

  return (
    <View style={styles.container}>
      {/* Budget summary strip */}
      <View style={styles.budgetStrip}>
        <View style={styles.budgetStripLeft}>
          <Text style={styles.budgetStripName}>{list.name}</Text>
          <Text style={styles.budgetStripSub}>Бюджет {formatEur(list.budget_eur)} · {formatPrice(budgetBgn)}</Text>
        </View>
        <View style={styles.budgetStripRight}>
          <Text style={[styles.budgetStripSpent, { color: isOver ? Colors.bad : Colors.ink }]}>
            {formatPrice(totalSpent)}
          </Text>
          <Text style={[styles.budgetStripRem, { color: barColor }]}>
            {isOver ? `+${formatPrice(totalSpent - budgetBgn)} над` : `${formatPrice(budgetBgn - totalSpent)} остава`}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: barColor }]} />
        </View>
      </View>

      {/* Add item row */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Добави продукт..."
          placeholderTextColor={Colors.inkFaint}
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
          <Text style={styles.addBtnText}>{adding ? '…' : '+'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.accent} />}
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
        visible={showNewList} name={newListName} budget={newBudget}
        onChangeName={setNewListName} onChangeBudget={setNewBudget}
        onConfirm={handleCreateList} onClose={() => setShowNewList(false)}
      />
    </View>
  );
}

function NewListModal({ visible, name, budget, onChangeName, onChangeBudget, onConfirm, onClose }: {
  visible: boolean; name: string; budget: string;
  onChangeName: (v: string) => void; onChangeBudget: (v: string) => void;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Нов списък</Text>
          <TextInput style={styles.modalInput} placeholder="Название (напр. Седмично)" value={name}
            onChangeText={onChangeName} placeholderTextColor={Colors.inkFaint} />
          <TextInput style={styles.modalInput} placeholder="Бюджет в евро (напр. 100)" value={budget}
            onChangeText={onChangeBudget} keyboardType="numeric" placeholderTextColor={Colors.inkFaint} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Отказ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>Създай</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  createBtn: {
    marginTop: 20, backgroundColor: Colors.accent,
    borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  budgetStrip: {
    backgroundColor: Colors.surface, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  budgetStripLeft: { flex: 1 },
  budgetStripName: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  budgetStripSub: { fontSize: 11, color: Colors.inkSoft, marginTop: 2 },
  budgetStripRight: { alignItems: 'flex-end' },
  budgetStripSpent: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  budgetStripRem: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  progressWrap: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 12 },
  progressBg: {
    height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 999, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },

  addRow: {
    flexDirection: 'row', marginHorizontal: 14, marginVertical: 10, gap: 8, alignItems: 'center',
  },
  addInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.ink,
    borderWidth: 1, borderColor: 'rgba(43,29,18,0.08)',
  },
  addBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    width: 46, height: 46, alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },

  list: { paddingHorizontal: 14, paddingBottom: 24, gap: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    shadowColor: '#2b1d12', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  itemChecked: { opacity: 0.45 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.inkFaint,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxChecked: { backgroundColor: Colors.good, borderColor: Colors.good },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 13 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, color: Colors.ink, fontWeight: '500' },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.inkFaint },
  itemStore: { fontSize: 11, color: Colors.inkFaint, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  itemPriceChecked: { color: Colors.inkFaint },

  newListBtn: {
    alignSelf: 'center', marginTop: 16, marginBottom: 4,
    paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 999, borderWidth: 1.5, borderColor: Colors.accent,
  },
  newListBtnText: { color: Colors.accent, fontWeight: '700', fontSize: 13 },
  emptyList: { alignItems: 'center', paddingTop: 40, gap: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(43,29,18,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: Colors.surface, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: 'rgba(43,29,18,0.12)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.ink, marginBottom: 12, backgroundColor: Colors.canvas,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: Colors.surfaceAlt,
  },
  modalCancelText: { color: Colors.inkSoft, fontWeight: '600' },
  modalConfirm: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: Colors.accent,
  },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
