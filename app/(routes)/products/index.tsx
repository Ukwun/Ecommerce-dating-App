import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosinstance';
import { ProductCard } from '@/components/home/products';
import ProductSkeleton from '@/components/skeleton/product.skeleton';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useTheme } from '@/hooks/useTheme';
import FilterModal, { Filters } from '@/components/products/filter-modal';

export default function AllProductsScreen() {
  const params = useLocalSearchParams<{ search?: string }>();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { isDark } = useTheme();
  const [filters, setFilters] = useState<Filters>({ search: params.search });
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  const fetchProducts = async ({ pageParam = 1 }) => {
    const response = await axiosInstance.get('/product/api/get-all-products', {
      params: { page: pageParam, limit: 12, ...filters },
    });
    return response.data;
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['allProducts', filters],
    queryFn: fetchProducts,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.products.length ? allPages.length + 1 : undefined;
    },
  });

  const allProducts = data?.pages.flatMap(page => page.products) ?? [];

  const handleToggleWishlist = (id: string) => {
    toggleWishlist(id);
  };

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
  };

  const backgroundColors: [string, string] = isDark ? ['#111827', '#1F2937'] : ['#F9FAFB', '#F3F4F6'];
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const tintColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={{ flex: 1, backgroundColor: backgroundColors[0] }}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>All Products</Text>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
            <Ionicons name="filter" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 14, paddingTop: 16 }}>
            {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={allProducts}
            renderItem={({ item }) => <ProductCard item={item} wishlist={wishlistIds} toggleWishlist={handleToggleWishlist} addToCart={addToCart} />}
            keyExtractor={(item) => item._id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 14 }}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="large" color={isDark ? '#fff' : '#FF8C00'} style={{ marginVertical: 20 }} /> : null}
            refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} tintColor={tintColor} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="sad-outline" size={80} color={isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF'} />
                <Text style={[styles.emptyText, { color: textColor }]}>No Products Found</Text>
                <Text style={[styles.emptySubText, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                  Try adjusting your filters or check back later.
                </Text>
              </View>
            )}
          />
        )}

        <FilterModal
          isVisible={isFilterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onApply={handleApplyFilters}
          currentFilters={filters}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  filterButton: { padding: 4 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});