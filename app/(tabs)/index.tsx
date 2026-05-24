import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { searchProducts } from '../../lib/queries';
import { formatPrice } from '../../lib/currency';
import type { ProductWithPrices } from '../../types';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      Alert.alert('Търсене', 'Въведи поне 2 символа');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchProducts(query.trim());
      setResults(data);
    } catch {
      Alert.alert('Грешка', 'Не можа да се извърши търсенето.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const renderProduct = ({ item }: { item: ProductWithPrices }) => (
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
        {item.cheapest_price != null && (
          <View style={styles.cheapestPill}>
            <Text style={styles.cheapestPrice}>{formatPrice(item.cheapest_price)}</Text>
          </View>
        )}
      </View>

      {item.cheapest_store && (
        <View style={styles.cheapestRow}>
          <View style={[styles.storeDot, { backgroundColor: Colors.stores[item.cheapest_store.slug as keyof typeof Colors.stores] ?? Colors.accent }]} />
          <Text style={styles.cheapestLabel}>Най-евтино в </Text>
          <Text style={styles.cheapestStoreName}>{item.cheapest_store.name}</Text>
        </View>
      )}

      <View style={styles.priceRow}>
        {item.prices.slice(0, 5).map((p) => {
          const eff = p.is_promotion && p.promo_price ? p.promo_price : p.price;
          const isLowest = eff === item.cheapest_price;
          return (
            <View key={p.store_id} style={[styles.priceChip, isLowest && styles.priceChipBest]}>
              <Text style={styles.priceChipStore}>{p.store?.name.slice(0, 3)}</Text>
              <Text style={[styles.priceChipVal, isLowest && styles.priceChipValBest]}>{formatPrice(eff)}</Text>
              {p.is_promotion && <Text style={styles.promoMark}>%</Text>}
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Мляко, хляб, домати..."
            placeholderTextColor={Colors.inkFaint}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Търси</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Търся...</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🤷</Text>
          <Text style={styles.emptyTitle}>Няма резултати</Text>
          <Text style={styles.emptyHint}>Провери изписването или търси по-общо</Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Сравни цени</Text>
          <Text style={styles.emptyHint}>Намери най-изгодната оферта{'\n'}в Billa, Lidl, Kaufland, Metro и Fantastico</Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  searchWrap: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: 'rgba(43,29,18,0.07)',
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.canvas, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchIcon: { fontSize: 15 },
  input: { flex: 1, fontSize: 15, color: Colors.ink, fontWeight: '500' },
  clearBtn: { fontSize: 13, color: Colors.inkFaint, paddingHorizontal: 4 },
  searchBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  loadingText: { marginTop: 12, color: Colors.inkSoft, fontSize: 14 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  list: { padding: 14, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16,
    shadowColor: '#2b1d12', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  cardTitles: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.ink, letterSpacing: -0.2 },
  brand: { fontSize: 12, color: Colors.inkFaint, marginTop: 2 },
  cheapestPill: { backgroundColor: Colors.accentSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  cheapestPrice: { fontSize: 14, fontWeight: '800', color: Colors.accent },
  cheapestRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  storeDot: { width: 8, height: 8, borderRadius: 4 },
  cheapestLabel: { fontSize: 12, color: Colors.inkSoft },
  cheapestStoreName: { fontSize: 12, fontWeight: '700', color: Colors.ink },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  priceChip: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center',
    minWidth: 60, flexDirection: 'row', gap: 4,
  },
  priceChipBest: { backgroundColor: Colors.accentSoft },
  priceChipStore: { fontSize: 10, color: Colors.inkSoft, fontWeight: '600' },
  priceChipVal: { fontSize: 12, fontWeight: '700', color: Colors.ink },
  priceChipValBest: { color: Colors.accent },
  promoMark: {
    fontSize: 9, color: Colors.accent, fontWeight: '800',
    backgroundColor: 'rgba(198,78,46,0.12)', paddingHorizontal: 3, borderRadius: 4,
  },
});
