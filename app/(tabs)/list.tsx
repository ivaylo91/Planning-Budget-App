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

  const totalSpent = (list?.items ?? [])
    .filter((i) => !i.is_checked)
    .reduce((sum, i) => sum + (i.price_at_add ?? 0) * i.quantity, 0);

  const budgetBgn = list ? eurToBgn(list.budget_eur) : 0;
  const isOverBudget = totalSpent > budgetBgn;

  const handleAddItem = async () => {
    if (!list || newItem.trim().length < 2) return;
    setAdding(true);
    try {
      const item = await addItemToList(list.id, newItem.trim(), null);
      setList((prev) => prev ? { ...prev, items: [...(prev.items ?? []), item] } : prev);
      setNewItem('');
    } catch {
      Alert.alert('Грешка', 'Не можа да се добави продуктът.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: ListItem) => {
    try {
      await toggleItemChecked(item.id, !item.is_checked);
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items?.map((i) =>
            i.id === item.id ? { ...i, is_checked: !i.is_checked } : i
          ),
        };
      });
    } catch {
      Alert.alert('Грешка', 'Не можа да се актуализира.');
    }
  };

  const handleRemove = (item: ListItem) => {
    Alert.alert(
      'Изтрий',
      `Изтрий „${item.product_name}" от списъка?`,
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Изтрий',
          style: 'destructive',
          onPress: async () => {
            await removeItemFromList(item.id);
            setList((prev) =>
              prev ? { ...prev, items: prev.items?.filter((i) => i.id !== item.id) } : prev
            );
          },
        },
      ]
    );
  };

  const handleCreateList = async () => {
    const budget = parseFloat(newBudget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert('Грешка', 'Въведи валиден бюджет.');
      return;
    }
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
        {item.store && (
          <Text style={styles.itemStore}>{item.store.name}</Text>
        )}
      </View>
      {item.price_at_add && (
        <Text style={[styles.itemPrice, item.is_checked && styles.itemPriceChecked]}>
          {formatPrice(item.price_at_add * item.quantity)}
        </Text>
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyText}>Нямаш активен списък за пазаруване</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewList(true)}>
          <Text style={styles.createBtnText}>+ Създай списък</Text>
        </TouchableOpacity>
        <NewListModal
          visible={showNewList}
          name={newListName}
          budget={newBudget}
          onChangeName={setNewListName}
          onChangeBudget={setNewBudget}
          onConfirm={handleCreateList}
          onClose={() => setShowNewList(false)}
        />
      </View>
    );
  }

  const unchecked = (list.items ?? []).filter((i) => !i.is_checked);
  const checked = (list.items ?? []).filter((i) => i.is_checked);

  return (
    <View style={styles.container}>
      {/* Budget bar */}
      <View style={[styles.budgetBar, isOverBudget && styles.budgetBarOver]}>
        <View>
          <Text style={styles.budgetLabel}>{list.name}</Text>
          <Text style={styles.budgetSub}>
            Бюджет: {formatEur(list.budget_eur)} ({formatPrice(budgetBgn)})
          </Text>
        </View>
        <View style={styles.budgetRight}>
          <Text style={[styles.budgetSpent, isOverBudget && styles.budgetOver]}>
            {formatPrice(totalSpent)}
          </Text>
          {isOverBudget && <Text style={styles.overLabel}>⚠️ НАДВИШЕН!</Text>}
          {!isOverBudget && (
            <Text style={styles.budgetRemaining}>
              остават {formatPrice(budgetBgn - totalSpent)}
            </Text>
          )}
        </View>
      </View>

      {/* Add item */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Добави продукт..."
          placeholderTextColor={Colors.textSecondary}
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
          <Text style={styles.addBtnText}>{adding ? '...' : '+'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          checked.length > 0 && unchecked.length > 0
            ? <Text style={styles.sectionLabel}>Купени ({checked.length})</Text>
            : null
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.newListBtn} onPress={() => setShowNewList(true)}>
            <Text style={styles.newListBtnText}>+ Нов списък</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Списъкът е празен.{'\n'}Добави продукти по-горе.</Text>
          </View>
        }
      />

      <NewListModal
        visible={showNewList}
        name={newListName}
        budget={newBudget}
        onChangeName={setNewListName}
        onChangeBudget={setNewBudget}
        onConfirm={handleCreateList}
        onClose={() => setShowNewList(false)}
      />
    </View>
  );
}

function NewListModal({
  visible, name, budget, onChangeName, onChangeBudget, onConfirm, onClose,
}: {
  visible: boolean;
  name: string;
  budget: string;
  onChangeName: (v: string) => void;
  onChangeBudget: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Нов списък</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Име на списъка"
            value={name}
            onChangeText={onChangeName}
            placeholderTextColor={Colors.textSecondary}
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Бюджет в евро (напр. 100)"
            value={budget}
            onChangeText={onChangeBudget}
            keyboardType="numeric"
            placeholderTextColor={Colors.textSecondary}
          />
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
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  createBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  budgetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  budgetBarOver: { backgroundColor: Colors.error },
  budgetLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  budgetSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  budgetRight: { alignItems: 'flex-end' },
  budgetSpent: { color: '#fff', fontWeight: '800', fontSize: 20 },
  budgetOver: { color: '#FFCDD2' },
  overLabel: { color: '#FFCDD2', fontSize: 12, fontWeight: '700' },
  budgetRemaining: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  addRow: {
    flexDirection: 'row',
    margin: 12,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  itemChecked: { opacity: 0.5 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  itemStore: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  itemPriceChecked: { color: Colors.textSecondary },
  newListBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  newListBtnText: { color: Colors.primary, fontWeight: '600' },
  emptyList: { alignItems: 'center', paddingTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
