import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, AppColors, Gradients } from '../../constants/colors';
import { searchProducts } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import { SearchIcon, XIcon, BarcodeIcon } from '../../components/Icons';
import { StoreIcon } from '../../components/StoreIcon';
import { FLOATING_TAB_HEIGHT } from '../../components/FloatingTabBar';
import type { ProductWithPrices } from '../../types';

const CATEGORIES = [
  { id: '1', icon: '🥛', name: 'Млечни' },
  { id: '2', icon: '🥩', name: 'Месо' },
  { id: '3', icon: '🍎', name: 'Плодове' },
  { id: '4', icon: '🥦', name: 'Зеленчуци' },
  { id: '5', icon: '🍞', name: 'Хляб' },
  { id: '6', icon: '🧃', name: 'Напитки' },
  { id: '7', icon: '🧴', name: 'Хигиена' },
  { id: '8', icon: '🍫', name: 'Сладки' },
];

const STORE_FILTERS = [
  { slug: null, name: 'Всички', color: '#b89978' },
  { slug: 'billa', name: 'Billa', color: '#E30613' },
  { slug: 'lidl', name: 'Lidl', color: '#0050AA' },
  { slug: 'kaufland', name: 'Kaufland', color: '#E40521' },
  { slug: 'metro', name: 'Metro', color: '#003882' },
  { slug: 'fantastico', name: 'Fantastico', color: '#e57a4e' },
];

export default function SearchScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const handleSearch = useCallback(async (q?: string) => {
    const searchQ = (q ?? query).trim();
    if (searchQ.length < 2) { Alert.alert('Търсене', 'Въведи поне 2 символа'); return; }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchProducts(searchQ);
      setAllResults(data);
    } catch {
      Alert.alert('Грешка', 'Не можа да се извърши търсенето.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleCategoryPress = (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    setQuery(cat.name);
    setSelectedStore(null);
    handleSearch(cat.name);
  };

  const handleStoreSelect = (slug: string | null) => {
    setSelectedStore(slug);
  };

  const results = useMemo(() => {
    if (!selectedStore) return allResults;
    return allResults.filter((p) =>
      p.prices.some((price) => price.store?.slug === selectedStore)
    );
  }, [allResults, selectedStore]);

  const renderProduct = ({ item }: { item: ProductWithPrices }) => {
    const displayPrices = selectedStore
      ? item.prices.filter((p) => p.store?.slug === selectedStore)
      : item.prices.slice(0, 5);

    const cheapestInFilter = selectedStore
      ? displayPrices[0]
      : item.prices.find((p) => {
          const eff = p.is_promotion && p.promo_price ? p.promo_price : p.price;
          return eff === item.cheapest_price;
        });

    const cheapestEff = cheapestInFilter
      ? (cheapestInFilter.is_promotion && cheapestInFilter.promo_price
          ? cheapestInFilter.promo_price
          : cheapestInFilter.price)
      : item.cheapest_price;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTitles}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
          </View>
          {cheapestEff != null && (
            <View style={styles.cheapestPill}>
              <Text style={styles.cheapestPrice}>{formatPrice(cheapestEff)}</Text>
            </View>
          )}
        </View>

        {!selectedStore && item.cheapest_store && (
          <View style={styles.cheapestRow}>
            <View style={[styles.storeDot, { backgroundColor: c.stores[item.cheapest_store.slug as keyof typeof c.stores] ?? c.accent }]} />
            <Text style={styles.cheapestLabel}>Най-евтино: </Text>
            <Text style={styles.cheapestStoreName}>{item.cheapest_store.name}</Text>
          </View>
        )}

        <View style={styles.priceRow}>
          {displayPrices.map((p) => {
            const eff = p.is_promotion && p.promo_price ? p.promo_price : p.price;
            const isLowest = eff === cheapestEff;
            const storeColor = c.stores[p.store?.slug as keyof typeof c.stores] ?? c.accent;
            return (
              <View key={p.store_id} style={[styles.priceChip, isLowest && { backgroundColor: c.accentSoft }]}>
                <StoreIcon slug={p.store?.slug ?? ''} size={16} />
                <Text style={[styles.priceChipVal, isLowest && { color: c.accent }]}>{formatPrice(eff)}</Text>
                {p.is_promotion && <Text style={styles.promoMark}>%</Text>}
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  const showCategoryGrid = !searched && !loading;

  return (
    <View style={styles.container}>
      {/* Search header */}
      <View style={[styles.searchHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.screenTitle}>Търсене</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <SearchIcon size={16} color={c.inkFaint} />
            <TextInput
              style={styles.input}
              placeholder="Мляко, хляб, домати..."
              placeholderTextColor={c.inkFaint}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => {
                setQuery('');
                setAllResults([]);
                setSearched(false);
                setActiveCategory(null);
                setSelectedStore(null);
              }}>
                <XIcon size={15} color={c.inkFaint} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => handleSearch()}>
            <LinearGradient colors={Gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Търси</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/scanner')}>
            <BarcodeIcon size={20} color={c.accent} />
          </TouchableOpacity>
        </View>

        {/* Store filter chips — always visible */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeFilterRow}>
          {STORE_FILTERS.map((store) => {
            const isActive = selectedStore === store.slug;
            return (
              <TouchableOpacity
                key={store.slug ?? 'all'}
                style={[styles.storeChip, isActive && { backgroundColor: store.color, borderColor: store.color }]}
                onPress={() => handleStoreSelect(store.slug)}
              >
                {store.slug && <StoreIcon slug={store.slug} size={18} />}
                <Text style={[styles.storeChipText, isActive && { color: '#fff', fontWeight: '700' }]}>
                  {store.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category grid */}
      {showCategoryGrid && (
        <FlatList
          data={CATEGORIES}
          numColumns={4}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.catGrid, { paddingBottom: FLOATING_TAB_HEIGHT + 16 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.catSectionTitle}>Категории</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catCard, activeCategory === item.id && { backgroundColor: c.accentSoft, borderColor: c.accent }]}
              onPress={() => handleCategoryPress(item)}
              activeOpacity={0.75}
            >
              <Text style={styles.catIcon}>{item.icon}</Text>
              <Text style={[styles.catName, activeCategory === item.id && { color: c.accent }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={styles.loadingText}>Търся...</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🤷</Text>
          <Text style={styles.emptyTitle}>Няма резултати</Text>
          <Text style={styles.emptyHint}>
            {selectedStore
              ? `Няма продукти в ${STORE_FILTERS.find(s => s.slug === selectedStore)?.name}`
              : 'Провери изписването или търси по-общо'}
          </Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={[styles.list, { paddingBottom: FLOATING_TAB_HEIGHT + 16 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            selectedStore ? (
              <View style={[styles.filterResultHeader, { backgroundColor: c.accentSoft }]}>
                <View style={[styles.filterResultDot, { backgroundColor: STORE_FILTERS.find(s => s.slug === selectedStore)?.color }]} />
                <Text style={[styles.filterResultText, { color: c.accent }]}>
                  {results.length} продукта в {STORE_FILTERS.find(s => s.slug === selectedStore)?.name}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    searchHeader: { backgroundColor: c.surface, paddingHorizontal: 18, paddingBottom: 8, gap: 10 },
    screenTitle: { fontSize: 22, fontWeight: '800', color: c.ink, letterSpacing: -0.5 },
    searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    searchBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.canvas, borderRadius: 14,
      paddingHorizontal: 12, paddingVertical: 11,
      borderWidth: 1, borderColor: c.divider,
    },
    input: { flex: 1, fontSize: 15, color: c.ink, fontWeight: '500' },
    searchBtn: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    scanBtn: {
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: c.accent + '30',
    },

    storeFilterRow: { paddingBottom: 10, gap: 8, paddingRight: 4 },
    storeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
      backgroundColor: c.canvas, borderWidth: 1.5, borderColor: c.divider,
    },
    storeChipText: { fontSize: 12, fontWeight: '600', color: c.inkSoft },

    catGrid: { padding: 16, gap: 4 },
    catSectionTitle: { fontSize: 13, fontWeight: '700', color: c.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    catCard: {
      flex: 1, margin: 4, aspectRatio: 1,
      backgroundColor: c.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'transparent', gap: 4,
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    catIcon: { fontSize: 24 },
    catName: { fontSize: 10, fontWeight: '600', color: c.inkSoft, textAlign: 'center' },

    filterResultHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
    },
    filterResultDot: { width: 10, height: 10, borderRadius: 5 },
    filterResultText: { fontSize: 13, fontWeight: '600' },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
    loadingText: { marginTop: 12, color: c.inkSoft, fontSize: 14 },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.ink, marginBottom: 6 },
    emptyHint: { fontSize: 14, color: c.inkSoft, textAlign: 'center', lineHeight: 20 },

    list: { padding: 14, gap: 10 },
    card: {
      backgroundColor: c.surface, borderRadius: 18, padding: 16,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
    cardTitles: { flex: 1 },
    productName: { fontSize: 15, fontWeight: '700', color: c.ink, letterSpacing: -0.2 },
    brand: { fontSize: 12, color: c.inkFaint, marginTop: 2 },
    cheapestPill: { backgroundColor: c.accentSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    cheapestPrice: { fontSize: 14, fontWeight: '800', color: c.accent },
    cheapestRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 5 },
    storeDot: { width: 8, height: 8, borderRadius: 4 },
    cheapestLabel: { fontSize: 12, color: c.inkSoft },
    cheapestStoreName: { fontSize: 12, fontWeight: '700', color: c.ink },
    priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    priceChip: {
      backgroundColor: c.surfaceAlt, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 5,
      flexDirection: 'row', gap: 4, alignItems: 'center',
    },
    priceChipVal: { fontSize: 12, fontWeight: '700', color: c.ink },
    promoMark: { fontSize: 9, fontWeight: '800', color: c.accent, backgroundColor: c.accentSoft, paddingHorizontal: 3, borderRadius: 4 },
  });
}
