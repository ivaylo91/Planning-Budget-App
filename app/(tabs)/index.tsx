import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { searchProducts } from '../../lib/queries';
import { formatPrice, eurToBgn } from '../../lib/currency';
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
      Alert.alert('Грешка', 'Не можа да се извърши търсенето. Провери връзката си.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const renderProduct = ({ item }: { item: ProductWithPrices }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
      </View>

      {item.cheapest_store && (
        <View style={styles.cheapestBadge}>
          <Text style={styles.cheapestLabel}>🏆 Най-евтино</Text>
          <View style={[styles.storeDot, { backgroundColor: Colors.stores[item.cheapest_store.slug as keyof typeof Colors.stores] ?? Colors.primary }]} />
          <Text style={styles.cheapestStore}>{item.cheapest_store.name}</Text>
          <Text style={styles.cheapestPrice}>{formatPrice(item.cheapest_price!)}</Text>
        </View>
      )}

      <View style={styles.priceRow}>
        {item.prices.slice(0, 5).map((p) => (
          <View key={p.store_id} style={styles.priceChip}>
            <Text style={styles.priceStoreName}>{p.store?.name.slice(0, 3)}</Text>
            <Text style={[styles.priceValue, p.is_promotion && styles.promoPrice]}>
              {formatPrice(p.is_promotion && p.promo_price ? p.promo_price : p.price)}
            </Text>
            {p.is_promotion && <Text style={styles.promoTag}>%</Text>}
          </View>
        ))}
      </View>

      <Text style={styles.tapHint}>Натисни за пълно сравнение →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Търси продукт... (напр. мляко, хляб)"
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Търся...</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>😕</Text>
          <Text style={styles.emptyText}>Няма намерени продукти за „{query}"</Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.hintText}>Търси продукт и сравни цените{'\n'}в Billa, Lidl, Kaufland, Metro и Fantastico</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBox: {
    flexDirection: 'row',
    margin: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  searchBtnText: { fontSize: 22 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 15 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
  hintText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
  cardHeader: { marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  brand: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cheapestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  cheapestLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  storeDot: { width: 10, height: 10, borderRadius: 5 },
  cheapestStore: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  cheapestPrice: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  priceRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  priceChip: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 58,
  },
  priceStoreName: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  priceValue: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700' },
  promoPrice: { color: Colors.error },
  promoTag: {
    fontSize: 9,
    color: Colors.error,
    fontWeight: '800',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 3,
    borderRadius: 4,
  },
  tapHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 8, textAlign: 'right' },
});
