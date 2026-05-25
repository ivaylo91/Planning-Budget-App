import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, AppColors, Gradients } from '../../constants/colors';
import { getProductById, getActiveShoppingList, addItemToList } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import { ChevronLeftIcon, SparkleIcon } from '../../components/Icons';
import { StoreIcon } from '../../components/StoreIcon';
import type { ProductWithPrices, Price } from '../../types';

export default function ProductDetailScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const cheapestVal = sorted[0]
    ? (sorted[0].is_promotion && sorted[0].promo_price ? sorted[0].promo_price! : sorted[0].price)
    : 0;
  const mostExpVal = sorted[sorted.length - 1]
    ? (sorted[sorted.length - 1].is_promotion && sorted[sorted.length - 1].promo_price
        ? sorted[sorted.length - 1].promo_price!
        : sorted[sorted.length - 1].price)
    : 0;
  const maxSaving = mostExpVal - cheapestVal;
  const maxStoreTotal = sorted.reduce((max, p) => {
    const v = p.is_promotion && p.promo_price ? p.promo_price : p.price;
    return Math.max(max, v);
  }, 0);

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      {/* Custom header */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8, backgroundColor: c.canvas }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color={c.ink} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Product header */}
        <View style={[styles.headerCard, { backgroundColor: c.surface }]}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <View style={styles.metaRow}>
            {product.category && (
              <View style={[styles.metaChip, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[styles.metaChipText, { color: c.inkSoft }]}>
                  {product.category.icon} {product.category.name}
                </Text>
              </View>
            )}
            <View style={[styles.metaChip, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.metaChipText, { color: c.inkSoft }]}>📦 {product.unit}</Text>
            </View>
          </View>
        </View>

        {/* Savings banner */}
        {maxSaving > 0.01 && (
          <LinearGradient
            colors={Gradients.good}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.savingsBanner}
          >
            <SparkleIcon size={22} color="rgba(255,255,255,0.8)" />
            <View>
              <Text style={styles.savingsAmount}>{formatPrice(maxSaving)}</Text>
              <Text style={styles.savingsText}>
                Спести като купиш от {sorted[0].store?.name}
              </Text>
            </View>
          </LinearGradient>
        )}

        <Text style={[styles.sectionTitle, { color: c.inkSoft }]}>Сравнение на цени</Text>

        {sorted.map((price, idx) => {
          const storeColor = c.stores[price.store?.slug as keyof typeof c.stores] ?? c.accent;
          const eff = price.is_promotion && price.promo_price ? price.promo_price : price.price;
          const isCheapest = idx === 0;
          const isAdding = addingId === price.store_id;
          const barPct = maxStoreTotal > 0 ? (eff / maxStoreTotal) * 100 : 0;

          return (
            <View
              key={price.store_id}
              style={[styles.priceCard, { backgroundColor: c.surface }, isCheapest && { borderWidth: 1.5, borderColor: c.accentSoft }]}
            >
              <View style={[styles.priceCardAccent, { backgroundColor: storeColor }]} />
              <View style={styles.priceCardBody}>
                <View style={styles.storeRow}>
                  <StoreIcon slug={price.store?.slug ?? ''} size={24} />
                  <Text style={[styles.storeName, { color: c.ink }]}>{price.store?.name}</Text>
                  {isCheapest && (
                    <View style={[styles.cheapestBadge, { backgroundColor: c.accentSoft }]}>
                      <Text style={[styles.cheapestBadgeText, { color: c.accent }]}>Най-евтино</Text>
                    </View>
                  )}
                </View>

                {price.is_promotion && price.promo_price ? (
                  <View style={styles.promoPriceRow}>
                    <Text style={[styles.oldPrice, { color: c.inkFaint }]}>{formatPrice(price.price)}</Text>
                    <Text style={[styles.newPrice, { color: storeColor }]}>{formatPrice(price.promo_price)}</Text>
                    <View style={[styles.promoBadge, { backgroundColor: storeColor }]}>
                      <Text style={styles.promoBadgeText}>
                        -{Math.round(((price.price - price.promo_price) / price.price) * 100)}%
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.regularPrice, { color: c.ink }]}>{formatPrice(price.price)}</Text>
                )}

                {/* Bar chart */}
                <View style={[styles.barBg, { backgroundColor: c.surfaceAlt }]}>
                  <View style={[styles.barFill, { width: `${barPct}%` as any, backgroundColor: storeColor }]} />
                </View>

                {price.promo_end_date && (
                  <Text style={[styles.promoEnd, { color: c.inkFaint }]}>
                    до {new Date(price.promo_end_date).toLocaleDateString('bg-BG')}
                  </Text>
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

        <Text style={[styles.addHint, { color: c.inkFaint }]}>Натисни „+" за да добавиш в списъка</Text>

        {/* Strategy tip */}
        <View style={[styles.strategyCard, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Text style={[styles.strategyTitle, { color: c.ink }]}>💡 Стратегия</Text>
          <Text style={[styles.strategyText, { color: c.inkSoft }]}>
            {maxSaving > 0.01
              ? `Купи от ${sorted[0].store?.name} и спести ${formatPrice(maxSaving)} спрямо най-скъпия вариант.`
              : 'Цените в различните магазини са сходни за този продукт.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: c.inkSoft, fontSize: 15 },

    navBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 10,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
    navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center', marginHorizontal: 8 },

    content: { padding: 16, paddingBottom: 40, gap: 12 },

    headerCard: {
      borderRadius: 22, padding: 20,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    productName: { fontSize: 22, fontWeight: '800', color: c.ink, letterSpacing: -0.5, marginBottom: 4 },
    brand: { fontSize: 13, color: c.inkFaint, marginBottom: 12 },
    metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    metaChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    metaChipText: { fontSize: 12, fontWeight: '600' },

    savingsBanner: { borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
    savingsAmount: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    savingsText: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 2 },

    sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    priceCard: {
      borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    priceCardAccent: { width: 5, alignSelf: 'stretch' },
    priceCardBody: { flex: 1, padding: 14 },
    storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    storeDot: { width: 10, height: 10, borderRadius: 5 },
    storeName: { fontSize: 14, fontWeight: '700' },
    cheapestBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    cheapestBadgeText: { fontSize: 11, fontWeight: '700' },
    promoPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    oldPrice: { fontSize: 13, textDecorationLine: 'line-through' },
    newPrice: { fontSize: 20, fontWeight: '800' },
    promoBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    promoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    regularPrice: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    barBg: { height: 5, borderRadius: 999, overflow: 'hidden', marginBottom: 4 },
    barFill: { height: '100%', borderRadius: 999 },
    promoEnd: { fontSize: 10, marginTop: 2 },

    addBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    addBtnLoading: { opacity: 0.5 },
    addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },

    addHint: { textAlign: 'center', fontSize: 12 },

    strategyCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 6 },
    strategyTitle: { fontSize: 14, fontWeight: '700' },
    strategyText: { fontSize: 13, lineHeight: 19 },
  });
}
