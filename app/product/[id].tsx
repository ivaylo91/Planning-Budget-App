import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors, AppColors } from '../../constants/colors';
import { getProductById, getActiveShoppingList, addItemToList } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import type { ProductWithPrices, Price } from '../../types';

export default function ProductDetailScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductWithPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) getProductById(id).then(setProduct).finally(() => setLoading(false));
  }, [id]);

  const handleAddToList = async (price: Price) => {
    setAddingId(price.store_id);
    try {
      const list = await getActiveShoppingList();
      if (!list) {
        Alert.alert('Няма списък', 'Създай списък за пазаруване в таб „Списък".');
        return;
      }
      const eff = price.is_promotion && price.promo_price ? price.promo_price : price.price;
      await addItemToList(list.id, product!.name, eff, product!.id, price.store_id);
      Alert.alert('Добавено ✓', `„${product!.name}" от ${price.store?.name}`, [
        { text: 'Продължи', style: 'cancel' },
        { text: 'Към списъка', onPress: () => router.push('/(tabs)/list') },
      ]);
    } catch {
      Alert.alert('Грешка', 'Не можа да се добави продуктът.');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={c.accent} /></View>;
  }
  if (!product) {
    return <View style={styles.centered}><Text style={styles.errorText}>Продуктът не е намерен.</Text></View>;
  }

  const sorted = [...product.prices].sort((a, b) => {
    const pa = a.is_promotion && a.promo_price ? a.promo_price : a.price;
    const pb = b.is_promotion && b.promo_price ? b.promo_price : b.price;
    return pa - pb;
  });
  const cheapestVal = sorted[0] ? (sorted[0].is_promotion && sorted[0].promo_price ? sorted[0].promo_price! : sorted[0].price) : 0;
  const mostExpVal = sorted[sorted.length - 1] ? (sorted[sorted.length - 1].is_promotion && sorted[sorted.length - 1].promo_price ? sorted[sorted.length - 1].promo_price! : sorted[sorted.length - 1].price) : 0;
  const maxSaving = mostExpVal - cheapestVal;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <View style={styles.metaRow}>
          {product.category && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{product.category.icon} {product.category.name}</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>📦 {product.unit}</Text>
          </View>
        </View>
      </View>

      {maxSaving > 0.01 && (
        <View style={styles.savingsBanner}>
          <Text style={styles.savingsText}>
            💡 Спести до {formatPrice(maxSaving)} като купиш от {sorted[0].store?.name}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Сравнение на цени</Text>

      {sorted.map((price, idx) => {
        const storeColor = c.stores[price.store?.slug as keyof typeof c.stores] ?? c.accent;
        const eff = price.is_promotion && price.promo_price ? price.promo_price : price.price;
        const isCheapest = idx === 0;
        const isAdding = addingId === price.store_id;

        return (
          <View key={price.store_id} style={[styles.priceCard, isCheapest && styles.priceCardBest, { borderLeftColor: storeColor }]}>
            <View style={styles.priceCardLeft}>
              <View style={styles.storeRow}>
                <View style={[styles.storeDot, { backgroundColor: storeColor }]} />
                <Text style={styles.storeName}>{price.store?.name}</Text>
                {isCheapest && (
                  <View style={styles.cheapestBadge}>
                    <Text style={styles.cheapestBadgeText}>Най-евтино</Text>
                  </View>
                )}
              </View>

              {price.is_promotion && price.promo_price ? (
                <View style={styles.promoPriceRow}>
                  <Text style={styles.oldPrice}>{formatPrice(price.price)}</Text>
                  <Text style={[styles.newPrice, { color: storeColor }]}>{formatPrice(price.promo_price)}</Text>
                  <View style={[styles.promoBadge, { backgroundColor: storeColor }]}>
                    <Text style={styles.promoBadgeText}>
                      -{Math.round(((price.price - price.promo_price) / price.price) * 100)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.regularPrice}>{formatPrice(price.price)}</Text>
              )}

              {price.promo_end_date && (
                <Text style={styles.promoEnd}>до {new Date(price.promo_end_date).toLocaleDateString('bg-BG')}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: storeColor }, isAdding && styles.addBtnLoading]}
              onPress={() => handleAddToList(price)}
              disabled={!!addingId}
            >
              <Text style={styles.addBtnText}>{isAdding ? '…' : '+'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <Text style={styles.addHint}>Натисни „+" за да добавиш в списъка</Text>
    </ScrollView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    content: { padding: 16, paddingBottom: 40, gap: 10 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: c.inkSoft, fontSize: 15 },

    headerCard: {
      backgroundColor: c.surface, borderRadius: 22, padding: 20,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    productName: { fontSize: 22, fontWeight: '800', color: c.ink, letterSpacing: -0.5, marginBottom: 4 },
    brand: { fontSize: 13, color: c.inkFaint, marginBottom: 12 },
    metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    metaChip: { backgroundColor: c.surfaceAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    metaChipText: { fontSize: 12, color: c.inkSoft, fontWeight: '600' },

    savingsBanner: { backgroundColor: c.accentSoft, borderRadius: 14, padding: 14 },
    savingsText: { color: c.accent, fontWeight: '600', fontSize: 13, lineHeight: 18 },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },

    priceCard: {
      backgroundColor: c.surface, borderRadius: 16, padding: 16,
      flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5,
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    priceCardBest: { borderWidth: 1.5, borderLeftWidth: 5, borderColor: c.accentSoft },
    priceCardLeft: { flex: 1 },
    storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    storeDot: { width: 10, height: 10, borderRadius: 5 },
    storeName: { fontSize: 14, fontWeight: '700', color: c.ink },
    cheapestBadge: { backgroundColor: c.accentSoft, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    cheapestBadgeText: { fontSize: 11, fontWeight: '700', color: c.accent },
    promoPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    oldPrice: { fontSize: 13, color: c.inkFaint, textDecorationLine: 'line-through' },
    newPrice: { fontSize: 22, fontWeight: '800' },
    promoBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    promoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    regularPrice: { fontSize: 22, fontWeight: '800', color: c.ink },
    promoEnd: { fontSize: 11, color: c.inkFaint, marginTop: 4 },

    addBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    addBtnLoading: { opacity: 0.5 },
    addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },

    addHint: { textAlign: 'center', color: c.inkFaint, fontSize: 12 },
  });
}
