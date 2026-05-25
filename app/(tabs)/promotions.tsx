import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors } from '../../constants/colors';
import { getPromotions } from '../../lib/queries';
import { getCached, setCached } from '../../lib/cache';
import { formatPrice } from '../../lib/currency';
import { TagIcon } from '../../components/Icons';
import { StoreIcon } from '../../components/StoreIcon';
import { ProductImage } from '../../components/ProductImage';
import { FLOATING_TAB_HEIGHT } from '../../components/FloatingTabBar';
import type { ProductWithPrices, Price } from '../../types';

export default function PromotionsScreen() {
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
      if (!isRefresh) {
        const cached = await getCached<ProductWithPrices[]>('promotions');
        if (cached) {
          setProducts(cached);
          setLoading(false);
          return;
        }
      }
      const data = await getPromotions();
      setProducts(data);
      setCached('promotions', data);
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
      <View key={p.store_id} style={[styles.promoTag, { borderLeftColor: storeColor }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <StoreIcon slug={p.store?.slug ?? ''} size={20} />
          <Text style={[styles.storeTagName, { color: storeColor }]}>{p.store?.name}</Text>
          <View style={[styles.pctBadge, { backgroundColor: storeColor }]}>
            <Text style={styles.pctBadgeText}>-{pct}%</Text>
          </View>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.promoOld}>{formatPrice(p.price)}</Text>
          <Text style={[styles.promoNew, { color: storeColor }]}>{formatPrice(p.promo_price!)}</Text>
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
        <View style={styles.cardHeader}>
          <ProductImage
            uri={item.image_url}
            fallback={item.category?.icon ?? '📦'}
            size={44}
            borderRadius={10}
            bgColor={c.surfaceAlt}
          />
          <View style={styles.cardTitles}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
          </View>
        </View>
        <View style={styles.promosWrap}>{promos.map(renderPromo)}</View>
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
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.titleRow}>
              <TagIcon size={20} color={c.accent} />
              <Text style={styles.screenTitle}>Промоции</Text>
            </View>
            <Text style={styles.listHeaderSub}>Активни намаления тази седмица</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🏷️</Text>
            <Text style={styles.emptyTitle}>Няма активни промоции</Text>
            <Text style={styles.emptyHint}>Провери отново след следващата седмица</Text>
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
    emptyHint: { fontSize: 13, color: c.inkSoft, marginTop: 6, textAlign: 'center' },

    listHeader: { marginBottom: 14 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    screenTitle: { fontSize: 24, fontWeight: '800', color: c.ink, letterSpacing: -0.5 },
    listHeaderSub: { fontSize: 13, color: c.inkSoft, fontWeight: '500' },

    list: { paddingHorizontal: 16, gap: 12 },
    card: {
      backgroundColor: c.surface, borderRadius: 18, padding: 16,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    cardTitles: { flex: 1 },
    productName: { fontSize: 15, fontWeight: '700', color: c.ink, letterSpacing: -0.2 },
    brand: { fontSize: 12, color: c.inkFaint, marginTop: 2 },

    promosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    promoTag: {
      backgroundColor: c.canvas, borderRadius: 12, padding: 10,
      borderLeftWidth: 3, minWidth: 110,
    },
    storeTagName: { fontSize: 11, fontWeight: '700', flex: 1 },
    pctBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    pctBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    promoOld: { fontSize: 11, color: c.inkFaint, textDecorationLine: 'line-through' },
    promoNew: { fontSize: 17, fontWeight: '800' },
    promoEnd: { fontSize: 9, color: c.inkFaint, marginTop: 4 },
  });
}
