import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColors, AppColors } from '../../constants/colors';
import { getPromotions } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import type { ProductWithPrices, Price } from '../../types';

export default function PromotionsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getPromotions();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderPromo = (p: Price) => {
    const storeColor = c.stores[p.store?.slug as keyof typeof c.stores] ?? c.accent;
    const pct = p.promo_price ? Math.round(((p.price - p.promo_price) / p.price) * 100) : 0;
    return (
      <View key={p.store_id} style={styles.promoTag}>
        <View style={[styles.promoTagStore, { backgroundColor: storeColor }]}>
          <Text style={styles.promoTagStoreName}>{p.store?.name}</Text>
        </View>
        <View style={styles.promoTagBody}>
          <Text style={styles.promoOld}>{formatPrice(p.price)}</Text>
          <Text style={[styles.promoNew, { color: storeColor }]}>{formatPrice(p.promo_price!)}</Text>
          <View style={[styles.promoPct, { backgroundColor: storeColor }]}>
            <Text style={styles.promoPctText}>-{pct}%</Text>
          </View>
        </View>
        {p.promo_end_date && (
          <Text style={styles.promoEnd}>до {new Date(p.promo_end_date).toLocaleDateString('bg-BG')}</Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: ProductWithPrices }) => {
    const promos = item.prices.filter((p) => p.is_promotion && p.promo_price);
    if (!promos.length) return null;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${item.id}`)} activeOpacity={0.75}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
        <View style={styles.promoRow}>{promos.map(renderPromo)}</View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={c.accent} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>Активни намаления тази седмица</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🏷️</Text>
            <Text style={styles.emptyTitle}>Няма активни промоции</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    loadingText: { marginTop: 12, color: c.inkSoft },
    emptyEmoji: { fontSize: 44, marginBottom: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
    listHeader: { paddingHorizontal: 2, paddingBottom: 6, paddingTop: 4 },
    listHeaderText: { fontSize: 13, color: c.inkSoft, fontWeight: '500' },
    list: { padding: 14, paddingBottom: 24, gap: 10 },
    card: {
      backgroundColor: c.surface, borderRadius: 18, padding: 16,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    productName: { fontSize: 15, fontWeight: '700', color: c.ink, letterSpacing: -0.2 },
    brand: { fontSize: 12, color: c.inkFaint, marginTop: 2, marginBottom: 4 },
    promoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    promoTag: {
      borderRadius: 12, overflow: 'hidden',
      borderWidth: 1, borderColor: c.divider,
      minWidth: 100,
    },
    promoTagStore: { paddingHorizontal: 8, paddingVertical: 4 },
    promoTagStoreName: { color: '#fff', fontWeight: '700', fontSize: 11 },
    promoTagBody: { padding: 8, alignItems: 'flex-start', gap: 2 },
    promoOld: { fontSize: 11, color: c.inkFaint, textDecorationLine: 'line-through' },
    promoNew: { fontSize: 16, fontWeight: '800' },
    promoPct: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
    promoPctText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    promoEnd: { fontSize: 9, color: c.inkFaint, paddingHorizontal: 8, paddingBottom: 6 },
  });
}
