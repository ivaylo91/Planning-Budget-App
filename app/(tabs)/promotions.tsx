import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getPromotions } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import type { ProductWithPrices, Price } from '../../types';

export default function PromotionsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getPromotions();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renderPromoPrice = (p: Price) => {
    const storeColor = Colors.stores[p.store?.slug as keyof typeof Colors.stores] ?? Colors.primary;
    const saving = p.promo_price ? p.price - p.promo_price : 0;
    const pct = p.promo_price ? Math.round((saving / p.price) * 100) : 0;

    return (
      <View key={p.store_id} style={[styles.promoChip, { borderColor: storeColor }]}>
        <View style={[styles.storeHeader, { backgroundColor: storeColor }]}>
          <Text style={styles.storeName}>{p.store?.name}</Text>
        </View>
        <View style={styles.promoBody}>
          <Text style={styles.oldPrice}>{formatPrice(p.price)}</Text>
          <Text style={[styles.newPrice, { color: storeColor }]}>
            {formatPrice(p.promo_price!)}
          </Text>
          <View style={[styles.saveBadge, { backgroundColor: storeColor }]}>
            <Text style={styles.saveText}>-{pct}%</Text>
          </View>
          {p.promo_end_date && (
            <Text style={styles.endDate}>до {new Date(p.promo_end_date).toLocaleDateString('bg-BG')}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ProductWithPrices }) => {
    const promos = item.prices.filter((p) => p.is_promotion && p.promo_price);
    if (promos.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.productName}>{item.name}</Text>
        {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
        <View style={styles.promoRow}>{promos.map(renderPromoPrice)}</View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Зареждам промоции...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerText}>🏷️ Активни промоции от всички магазини</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyText}>Няма активни промоции в момента</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: Colors.textSecondary },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
  header: { paddingHorizontal: 12, paddingVertical: 10 },
  headerText: { color: Colors.textSecondary, fontSize: 13 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  productName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  brand: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  promoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  promoChip: {
    borderWidth: 2,
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 100,
  },
  storeHeader: { paddingHorizontal: 8, paddingVertical: 4 },
  storeName: { color: '#fff', fontWeight: '700', fontSize: 12 },
  promoBody: { padding: 8, alignItems: 'center' },
  oldPrice: {
    fontSize: 11,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  newPrice: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  saveBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  saveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  endDate: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
});
