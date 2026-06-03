import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, SafeAreaView } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosinstance';
import { useTheme } from '@/hooks/useTheme';
import { Image } from 'react-native';

export default function SellersScreen() {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSellers = async ({ pageParam = 1 }) => {
    try {
      const response = await axiosInstance.get('/seller/api/verified-sellers', {
        params: { page: pageParam, limit: 12, search: searchQuery },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
      return [];
    }
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
    queryKey: ['sellers', searchQuery],
    queryFn: fetchSellers,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
  });

  const allSellers = data?.pages.flat() ?? [];

  const backgroundColors: [string, string] = isDark ? ['#111827', '#1F2937'] : ['#F9FAFB', '#F3F4F6'];
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const tintColor = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';

  const renderSellerCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.sellerCard, { backgroundColor: cardBg }]}
      onPress={() => router.push({ pathname: '/(routes)/seller/[sellerId]', params: { sellerId: item._id || item.id } } as any)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.businessLogo || item.avatar || 'https://via.placeholder.com/80' }}
        style={styles.sellerImage}
      />
      <View style={styles.sellerInfo}>
        <View style={styles.sellerHeader}>
          <Text style={[styles.sellerName, { color: textColor }]} numberOfLines={1}>
            {item.businessName || item.name || 'Seller'}
          </Text>
          {item.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          )}
        </View>
        <Text style={[styles.sellerCategory, { color: isDark ? '#9CA3AF' : '#6B7280' }]} numberOfLines={1}>
          {item.category || 'Marketplace'}
        </Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={[styles.rating, { color: isDark ? '#D1D5DB' : '#374151' }]}>
              {item.rating.toFixed(1)} ({item.reviewCount || 0} reviews)
            </Text>
          </View>
        )}
        <Text style={[styles.productCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {item.productCount || 0} products
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: backgroundColors[0] }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Verified Sellers</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
          <Ionicons name="search" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search sellers..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#9CA3AF' : '#9CA3AF'} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF8C00" />
            <Text style={[styles.loadingText, { color: textColor }]}>Finding sellers...</Text>
          </View>
        ) : (
          <FlatList
            data={allSellers}
            renderItem={renderSellerCard}
            keyExtractor={(item, index) => item._id || item.id || index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator size="large" color="#FF8C00" style={{ marginVertical: 20 }} />
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} tintColor={tintColor} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="storefront-outline" size={80} color={isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF'} />
                <Text style={[styles.emptyText, { color: textColor }]}>No Sellers Found</Text>
                <Text style={[styles.emptySubText, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                  Try a different search term or check back later.
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sellerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sellerCategory: {
    fontSize: 12,
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
  },
  productCount: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    maxWidth: '80%',
    textAlign: 'center',
  },
});
