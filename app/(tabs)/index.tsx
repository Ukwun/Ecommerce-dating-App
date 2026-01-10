import React, { useEffect, useRef, useState, useCallback } from 'react'
import { StatusBar, StyleSheet, ScrollView, View, FlatList, TouchableOpacity, Image, Text, Dimensions, NativeSyntheticEvent, NativeScrollEvent, RefreshControl, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient';
import Header from '@/components/home/header'
import BigSaleBanner from '@/components/home/banner'
import axiosInstance from '@/utils/axiosinstance'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import ProductSkeleton from '@/components/skeleton/product.skeleton'
import { ProductCard } from '@/components/home/products'
import { router } from 'expo-router'
import { useCart } from '@/hooks/CartContext'
import { useWishlist } from '@/hooks/useWishlist';
import VerifiedSellers from '@/components/home/verified-sellers';
import { useTheme } from '@/hooks/useTheme';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
// import { usePushNotifications } from '@/hooks/usePushNotifications'; // Disabled for Expo Go SDK 53


export default function Index() {
  const horizontalFlatListRef = useRef<FlatList | null>(null);
  const mainFlatListRef = useRef<FlatList | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollInterval = useRef<number | null>(null);
  const userInteractionTimeout = useRef<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { addToCart, cartCount } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { isDark } = useTheme();
  const { recentlyViewedProducts, isLoadingRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  // Disabled push notifications for Expo Go SDK 53 compatibility
  // usePushNotifications();

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchText]);

  const fetchProducts = async ({ pageParam = 1 }) => {
    try {
      const response = await axiosInstance.get('/product/api/get-all-products', {
        params: { page: pageParam, limit: 10, search: debouncedSearchText },
      });
      console.log('✅ Products fetched:', response.data?.products?.length || 0);
      return response.data || { products: [], total: 0 };
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return { products: [], total: 0 };
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
    isError,
  } = useInfiniteQuery({
    queryKey: ['products', debouncedSearchText],
    queryFn: fetchProducts,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.products && lastPage.products.length ? allPages.length + 1 : undefined;
    },
    retry: 2,
  });

  const allProducts = data?.pages.flatMap(page => page.products) ?? [];

  const latestProductsData = allProducts.slice(0, 12);
  const products = allProducts.slice(12);
 
  useEffect(() => {
    if (products) console.log('Loaded products:', Array.isArray(products) ? products.length : 0)
    startAutoScroll();
    return () => stopAutoScroll(true); // Cleanup on unmount
  }, [products])

  const startAutoScroll = useCallback(() => {
    // Auto-scroll disabled due to ScrollView migration
    // TODO: Re-implement with manual scroll calculation if needed
    return;
  }, [latestProductsData.length]);

  const stopAutoScroll = useCallback((force = false) => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
    if (userInteractionTimeout.current) {
      clearTimeout(userInteractionTimeout.current);
      userInteractionTimeout.current = null;
    }
    // If not a forced stop (like unmount), restart after a delay
    if (!force) {
      userInteractionTimeout.current = setTimeout(() => {
        startAutoScroll();
      }, 5000); // Resume after 5 seconds of inactivity
    }
  }, [startAutoScroll]);

  const handleHorizontalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffset / cardWidth);
    setCurrentIndex(newIndex);
  };

  const handleVerticalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > Dimensions.get('window').height * 0.5) {
      setShowBackToTop(true);
    } else {
      setShowBackToTop(false);
    }
  };

  const scrollToTop = () => {
    mainFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleToggleWishlist = (id: string) => {
    toggleWishlist(id);
  }


  const renderListHeader = () => (
   <View>
        <Text style={styles.sectionTitle}>New Arrivals</Text>
    </View>
  );

 const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return;
    router.push({
      pathname: '/(routes)/products',
      params: { search: query },
    });
  };
 const renderListHeaderComponent = () => (
  <>
       <View style={styles.headerContainer}>
         <Header wishlist={wishlistIds} cartCount={cartCount} />
       </View>
 
       {/* Functional search bar placed under the top header */}
       <View style={styles.searchBarContainer}>
         <TextInput
           style={styles.searchBar}
           placeholder="Search for products..."
           placeholderTextColor="#9CA3AF"
           value={searchText}
           onChangeText={setSearchText}
           onSubmitEditing={() => handleSearchSubmit(searchText)}
         />
         <TouchableOpacity 
           onPress={() => handleSearchSubmit(searchText)}
           style={styles.searchButton}
         >
           <Ionicons name="search" size={20} color="#9CA3AF" />
         </TouchableOpacity>
       </View>
      {/* Sale Banner */}
      <View style={styles.bannerContainer}>
        <BigSaleBanner />
      </View>

      {/* Verified Sellers Section */}
      <VerifiedSellers />

      {/* New Arrivals Title */}
      
    </>
  );

  const PlaceholderScroller = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emptyListContainer}>
      {Array.from({ length: 10 }).map((_, index) => (
        <View key={index} style={styles.placeholderCard}>
          <View style={styles.productImage} />
          <TouchableOpacity style={styles.placeholderHeartIcon}>
            <AntDesign name="heart" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.productDetails}>
            {/* Product Name Placeholder */}
            <View style={{ height: 16, backgroundColor: '#4B5563', borderRadius: 4, marginBottom: 6 }} />
            {/* Price Placeholders with Text */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.placeholderPrice}>₦--,--</Text>
              <Text style={styles.placeholderOldPrice}>₦--,--</Text>
            </View>
            {/* Bottom Row with Rating and Button */}
            <View style={styles.bottomRow}>
              {/* Rating Placeholder */}
              <View style={styles.ratingRow}>
                <AntDesign name="star" size={14} color="#4B5563" />
                <Text style={styles.placeholderRatingText}>-.-</Text>
              </View>
              {/* "Buy Now" Placeholder Button with Icon */}
              <TouchableOpacity disabled style={styles.placeholderCartButton}>
                <Ionicons name="cart-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderListFooter = () => (
    <>
      {/* Recently Viewed Section */}
      {(recentlyViewedProducts && recentlyViewedProducts.length > 0) && (
        <View style={styles.latestProductsContainer}>
          <View style={styles.latestProductsHeader}>
            <Text style={[styles.latestProductsTitle, { color: isDark ? '#E5E7EB' : '#FFFFFF' }]}>Recently Viewed</Text>
          </View>
              {isLoadingRecentlyViewed ? (
            <PlaceholderScroller />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.latestProductsList}
            >
              {recentlyViewedProducts?.map((item, idx) => (
                <TouchableOpacity key={`recent-${item._id ?? `idx-${idx}`}`} onPress={() => router.push((`/product/${item._id}`) as any)} style={styles.productCard}>
                  <Image source={{ uri: item.image || item.images?.[0]?.url }} style={styles.productImage} />
                  <View style={styles.productDetails}>
                    <Text numberOfLines={1} style={styles.productName}>{item.name ?? item.title}</Text>
                    <Text style={styles.productPrice}>₦{Number(item.price ?? item.regular_price ?? 0).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Latest products horizontally scrollable */}
      <View style={styles.latestProductsContainer}>
        <View style={styles.latestProductsHeader}>
          <Text style={styles.latestProductsTitle}>Latest products</Text>
          <TouchableOpacity onPress={() => router.push('/(routes)/products')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {latestProductsData.length > 0 ? (
          <>
              <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.latestProductsList}
              scrollEventThrottle={16}
            >
              {latestProductsData?.map((item, idx) => (
                <TouchableOpacity key={item._id ?? String(idx || Math.random())} onPress={() => router.push((`/product/${item._id}`) as any)} style={styles.productCard}>
                  <Image source={{ uri: item.image || item.images?.[0]?.url }} style={styles.productImage} />
                  <View style={styles.productDetails}>
                    <Text numberOfLines={1} style={styles.productName}>{item.name ?? item.title}</Text>
                    <Text style={styles.productPrice}>₦{Number(item.price ?? item.regular_price ?? 0).toLocaleString()}</Text>
                    <View style={styles.ratingRow}>
                      <AntDesign name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {item.rating ? item.rating.toFixed(1) : "4.5"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.paginationContainer}>
              {latestProductsData.map((_, index) => (
                <View key={`dot-${index}`} style={[styles.paginationDot, currentIndex === index && styles.paginationDotActive]} />
              ))}
            </View>
          </>
        ) : (
          <PlaceholderScroller />
        )}
      </View>
      {/* Add some space at the bottom to ensure FAB doesn't overlap content */}
      <View style={{ height: 80 }} />
    </>
  );

  const NoResults = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingBottom: 100 }}>
      <Ionicons name="search-circle-outline" size={80} color="rgba(255,255,255,0.6)" />
      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 16 }}>No Products Found</Text>
      <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
        We couldn't find any products matching "{debouncedSearchText}". Try a different search.
      </Text>
    </View>
  );

  const EmptyState = () => (
    <View>
      <Text style={styles.sectionTitle}>Products</Text>
      <PlaceholderScroller />
    </View>
  );

  const renderEmpty = () => (
    <View>
      <Text style={styles.sectionTitle}>Products</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emptyListContainer}>
        {Array.from({ length: 10 }).map((_, index) => (
          <View key={index} style={styles.placeholderCard}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/150' }}
              style={styles.productImage}
            />
            {/* Simplified placeholder content for this section */}
            <View style={{ padding: 10, backgroundColor: '#f0f0f0', flex: 1 }}>
                <View style={{ height: 16, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 6 }} />
            </View> 
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <LinearGradient // Use theme-aware colors
      colors={isDark ? ['#1F2937', '#111827'] : ['#FF8C00', '#4B2E05']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#3B2F2F" />

        {isLoading && allProducts.length === 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderListHeader()}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 14 }}>
              {[0, 1, 2, 3, 4].map((_item, i) => (
                <ProductSkeleton key={i} />
              ))} 
            </View>
            {renderListFooter()}
          </ScrollView> 
        ) : (
          <FlatList
            ref={mainFlatListRef}
            data={allProducts}
            renderItem={({ item, index }) => <ProductCard item={item} wishlist={wishlistIds} toggleWishlist={handleToggleWishlist} addToCart={addToCart} index={index} />}
            keyExtractor={(item) => item._id || item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderListHeaderComponent}
            onScroll={handleVerticalScroll}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={debouncedSearchText ? NoResults : EmptyState}
            columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 14 }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponentStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={isDark ? '#F9FAFB' : '#FFFFFF'} />}
          />
        )}
        {showBackToTop && (
          <TouchableOpacity
            style={styles.backToTopButton}
            onPress={scrollToTop}
          >
            <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

      </SafeAreaView>
    </LinearGradient>
  )
}

const cardWidth = Dimensions.get('window').width * 0.45;

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  bannerContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  skeletonScroll: {
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  latestProductsContainer: {
    marginTop: 12,
  },
  latestProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  latestProductsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  latestProductsList: {
    paddingHorizontal: 14,
  },
  productCard: {
    width: cardWidth,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  productImage: { // Adjusted for placeholder
    width: '100%',
    height: 120,
    backgroundColor: '#374151',
  },
  productDetails: {
    padding: 10,
  },
  productName: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  productPrice: {
    color: '#FF8C00',
    fontWeight: '700',
    marginTop: 4,
    fontSize: 15,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 13,
    color: "#444",
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  emptyListContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  placeholderCard: {
    width: cardWidth,
    marginRight: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderHeartIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 6,
    borderRadius: 20,
  },
  placeholderCartButton: { // Restored and enhanced
    backgroundColor: '#374151',
    padding: 6,
    borderRadius: 20,
  },
  placeholderPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  placeholderOldPrice: {
    fontSize: 12,
    color: '#4B5563',
    textDecorationLine: 'line-through',
  },
  placeholderRatingText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#6B7280',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  backToTopButton: {
    position: 'absolute',
    bottom: 90, // Position above the tab bar
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
   searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)', // Semi-transparent white
        borderRadius: 10,
        paddingHorizontal: 10,
        marginHorizontal: 14,
        marginTop: -14, // Adjust as needed to overlap the header
    },
    searchBar: {
        flex: 1,
        fontSize: 16,
        color: '#fff', // White text color for visibility
        paddingVertical: 10,
    },
    searchButton: {
        padding: 8,
        borderRadius: 8,
    },

})
