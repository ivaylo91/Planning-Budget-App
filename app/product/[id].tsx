import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getProductById, getActiveShoppingList, addItemToList } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import type { ProductWithPrices, Price } from '../../types';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductWithPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getProductById(id)
        .then(setProduct)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleAddToList = async (price: Price) => {
    setAddingId(price.store_id);
    try {
      const list = await getActiveShoppingList();
      if (!list) {
        Alert.alert('Няма списък', 'Създай списък за пазаруване в таб „Списък".');
        return;
      }
      const effectivePrice = price.is_promotion && price.promo_price ? price.promo_price : price.price;
      await addItemToList(
        list.id,
        product!.name,
        effectivePrice,
        product!.id,
        price.store_id
      );
      Alert.alert(
        '✅ Добавено!',
        `„${product!.name}" от ${price.store?.name} е добавено в списъка.`,
        [
          { text: 'Продължи', style: 'cancel' },
          { text: 'Към списъка', onPress: () => router.push('/(tabs)/list') },
        ]
      );
    } catch {
      Alert.alert('Грешка', 'Не можа да се добави продуктът.');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Продуктът не е намерен.</Text>
      </View>
    );
  }

  const sortedPrices = [...product.prices].sort((a, b) => {
    const pa = a.is_promotion && a.promo_price ? a.promo_price : a.price;
    const pb = b.is_promotion && b.promo_price ? b.promo_price : b.price;
    return pa - pb;
  });

  const cheapestPrice = sortedPrices[0];
  const mostExpensive = sortedPrices[sortedPrices.length - 1];
  const cheapestVal = cheapestPrice?.is_promotion && cheapestPrice.promo_price
    ? cheapestPrice.promo_price : cheapestPrice?.price ?? 0;
  const expensiveVal = mostExpensive?.is_promotion && mostExpensive.promo_price
    ? mostExpensive.promo_price : mostExpensive?.price ?? 0;
  const maxSaving = expensiveVal - cheapestVal;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <View style={styles.metaRow}>
          {product.category && (
            <Text style={styles.metaBadge}>
              {product.category.icon} {product.category.name}
            </Text>
          )}
          <Text style={styles.metaBadge}>📦 {product.unit}</Text>
        </View>
      </View>

      {/* Savings banner */}
      {maxSaving > 0.01 && (
        <View style={styles.savingsBanner}>
          <Text style={styles.savingsText}>
            💡 Спести до {formatPrice(maxSaving)} като купуваш от {cheapestPrice.store?.name}!
          </Text>
        </View>
      )}

      {/* Price comparison */}
      <Text style={styles.sectionTitle}>Сравнение на цени</Text>

      {sortedPrices.map((price, index) => {
        const storeColor = Colors.stores[price.store?.slug as keyof typeof Colors.stores] ?? Colors.primary;
        const effectivePrice = price.is_promotion && price.promo_price ? price.promo_price : price.price;
        const isCheapest = index === 0;
        const isAdding = addingId === price.store_id;

        return (
          <View
            key={price.store_id}
            style={[styles.priceCard, isCheapest && styles.priceCardCheapest, { borderLeftColor: storeColor }]}
          >
            <View style={styles.priceCardLeft}>
              <View style={styles.storeRow}>
                <View style={[styles.storeDot, { backgroundColor: storeColor }]} />
                <Text style={styles.storeName}>{price.store?.name}</Text>
                {isCheapest && <Text style={styles.cheapestBadge}>🏆 Най-евтино</Text>}
              </View>

              {price.is_promotion && price.promo_price ? (
                <View style={styles.promoRow}>
                  <Text style={styles.oldPrice}>{formatPrice(price.price)}</Text>
                  <Text style={[styles.newPrice, { color: storeColor }]}>
                    {formatPrice(price.promo_price)}
                  </Text>
                  <View style={[styles.promoBadge, { backgroundColor: storeColor }]}>
                    <Text style={styles.promoText}>
                      -{Math.round(((price.price - price.promo_price) / price.price) * 100)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.regularPrice}>{formatPrice(price.price)}</Text>
              )}

              {price.promo_end_date && (
                <Text style={styles.promoEnd}>
                  Промоция до {new Date(price.promo_end_date).toLocaleDateString('bg-BG')}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: storeColor }, isAdding && styles.addBtnLoading]}
              onPress={() => handleAddToList(price)}
              disabled={!!addingId}
            >
              <Text style={styles.addBtnText}>{isAdding ? '...' : '+'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <Text style={styles.addHint}>Натисни „+" за да добавиш в списъка</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary, fontSize: 15 },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  productName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  brand: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaBadge: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  savingsBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  savingsText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  priceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  priceCardCheapest: {
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderColor: Colors.primary,
  },
  priceCardLeft: { flex: 1 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  storeDot: { width: 12, height: 12, borderRadius: 6 },
  storeName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cheapestBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  oldPrice: { fontSize: 13, color: Colors.textSecondary, textDecorationLine: 'line-through' },
  newPrice: { fontSize: 20, fontWeight: '800' },
  promoBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promoText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  regularPrice: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  promoEnd: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  addBtnLoading: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },
  addHint: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginTop: 8 },
});
