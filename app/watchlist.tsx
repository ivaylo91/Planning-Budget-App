import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors } from '../constants/colors';
import { getWatchlist, removeFromWatchlist } from '../lib/queries';
import { formatPrice } from '../lib/currency';
import { ChevronLeftIcon, HeartIcon } from '../components/Icons';
import { StoreIcon } from '../components/StoreIcon';
import { ProductImage } from '../components/ProductImage';
import type { ProductWithPrices } from '../types';

export default function WatchlistScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getWatchlist();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = (product: ProductWithPrices) => {
    Alert.alert(
      'Премахни от следените',
      `„${product.name}" ще бъде премахнат от списъка ти.`,
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Премахни',
          style: 'destructive',
          onPress: async () => {
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            try { await removeFromWatchlist(product.id); }
            catch { load(); }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ProductWithPrices }) => {
    const storeColor = item.cheapest_store
      ? c.stores[item.cheapest_store.slug as keyof typeof c.stores] ?? c.accent
      : c.accent;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: c.surface }]}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.78}
      >
        <ProductImage
          uri={item.image_url}
          fallback={item.category?.icon ?? '📦'}
          size={52}
          borderRadius={13}
          bgColor={c.surfaceAlt}
        />

        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{item.name}</Text>
          {item.brand && <Text style={[styles.brand, { color: c.inkFaint }]}>{item.brand}</Text>}

          {item.cheapest_store && item.cheapest_price != null && (
            <View style={styles.priceRow}>
              <StoreIcon slug={item.cheapest_store.slug} size={14} />
              <Text style={[styles.storeName, { color: c.inkSoft }]}>{item.cheapest_store.name}</Text>
              <View style={[styles.pricePill, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.price, { color: c.accent }]}>{formatPrice(item.cheapest_price)}</Text>
              </View>
            </View>
          )}

          {item.prices.some((p) => p.is_promotion) && (
            <View style={[styles.promoBadge, { backgroundColor: storeColor }]}>
              <Text style={styles.promoBadgeText}>В промоция</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.heartBtn} onPress={() => handleRemove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <HeartIcon size={18} color="#e05252" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color={c.ink} />
        </TouchableOpacity>
        <View>
          <Text style={styles.navTitle}>Следени продукти</Text>
          {!loading && <Text style={[styles.navSub, { color: c.inkSoft }]}>{products.length} продукта</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🤍</Text>
              <Text style={[styles.emptyTitle, { color: c.ink }]}>Нямаш следени продукти</Text>
              <Text style={[styles.emptyHint, { color: c.inkSoft }]}>
                Натисни ❤️ на страницата на продукт, за да го добавиш тук
              </Text>
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
      paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    navTitle: { fontSize: 18, fontWeight: '800', color: c.ink, letterSpacing: -0.3, textAlign: 'center' },
    navSub: { fontSize: 11, textAlign: 'center', marginTop: 1 },

    list: { padding: 16, gap: 10, paddingBottom: 40 },

    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 18, padding: 14,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    cardBody: { flex: 1, gap: 4 },
    name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    brand: { fontSize: 11 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    storeName: { fontSize: 11, fontWeight: '500', flex: 1 },
    pricePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    price: { fontSize: 13, fontWeight: '800' },
    promoBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 },
    promoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    heartBtn: { padding: 4 },

    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '700' },
    emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  });
}
