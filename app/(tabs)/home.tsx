import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeInDown, FadeInRight, ZoomIn, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useAuth } from '@/hooks/AuthContext';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { ProductCard } from '@/components/home/products';
import axiosInstance from '@/utils/axiosinstance';
import FilterModal, { Filters } from '../(routes)/products/filter-modal';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const categories = [
  { id: 'All', name: 'All', icon: 'grid' },
  { id: 'Tech', name: 'Tech', icon: 'smartphone' },
  { id: 'Fashion', name: 'Fashion', icon: 'watch' },
  { id: 'Home', name: 'Home', icon: 'home' },
  { id: 'Vehicles', name: 'Vehicles', icon: 'truck' },
  { id: 'Sports', name: 'Sports', icon: 'activity' },
];

function PressableIcon({ onPress, children, style }: any) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedTouchable
      style={[aStyle, style]}
      onPressIn={() => { scale.value = withSpring(0.88); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPress}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

function SellerCard({ item, index }: { item: any; index: number }) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const router = useRouter();
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).springify()}>
      <AnimatedTouchable
        style={[styles.promotedCard, aStyle]}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => router.push({ pathname: '/(routes)/seller/[sellerId]', params: { sellerId: item._id || item.userId?._id, name: item.businessName || item.userId?.name, avatar: item.userId?.avatar?.url || item.userId?.avatar } } as any)}
        activeOpacity={1}
      >
        <Image source={{ uri: item.userId?.avatar?.url || item.userId?.avatar || 'https://i.pravatar.cc/150?u=' + item._id }} style={styles.promotedImage} />
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
        <View style={styles.promotedDetails}>
          <Text style={styles.promotedName} numberOfLines={1}>{item.businessName || item.userId?.name}</Text>
          <Text style={styles.promotedSeller} numberOfLines={1}>{item.businessCategory || 'Seller'}</Text>
          <Text style={styles.promotedRating}>⭐ {item.averageRating?.toFixed(1) || '5.0'}</Text>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const { items, addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [verifiedSellers, setVerifiedSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [refreshing, setRefreshing] = useState(false);

  // Badge bounce animation
  const badgeScale = useSharedValue(1);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  useEffect(() => {
    if (items.length > 0) {
      badgeScale.value = withSpring(1.4, {}, () => { badgeScale.value = withSpring(1); });
    }
  }, [badgeScale, items.length]);

  const fetchVerifiedSellers = async () => {
    try {
      const res = await axiosInstance.get('/auth/api/verified-sellers');
      if (res.data?.data?.length > 0) setVerifiedSellers(res.data.data);
    } catch (_) {}
  };

  const fetchProducts = useCallback(async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (pageNum === 1 && !shouldRefresh) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);

      const params = new URLSearchParams();
      params.append('limit', '10');
      params.append('page', pageNum.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (filters.sortBy) params.append('sort', filters.sortBy);
      if (activeCategory !== 'All') params.append('category', activeCategory);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.color) params.append('color', filters.color);
      if (filters.size) params.append('size', filters.size);

      const response = await axiosInstance.get(`/marketplace/api/products?${params.toString()}`);
      const fetchedData = response.data.data || [];
      const mappedProducts = fetchedData.map((p: any) => ({
        ...p,
        name: p.name || p.title,
        image: p.thumbnail || p.images?.[0]?.url || p.images?.[0] || '',
        rating: p.ratings || 0,
      }));

      if (fetchedData.length < 10) setHasMore(false);
      if (pageNum === 1) {
        setProducts(mappedProducts);
        if (mappedProducts.length === 0) setHasMore(false);
      } else {
        setProducts(prev => [...prev, ...mappedProducts]);
      }
      setPage(pageNum);
    } catch {
      if (pageNum === 1) { setProducts([]); setHasMore(false); }
    } finally {
      setLoading(false); setLoadingMore(false); setRefreshing(false);
    }
  }, [searchQuery, filters, activeCategory]);

  useEffect(() => {
    fetchVerifiedSellers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setHasMore(true); fetchProducts(1); }, 400);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const onRefresh = () => { setRefreshing(true); fetchProducts(1, true); };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'User'}! 👋</Text>
            <Text style={styles.subGreeting}>What are you looking for?</Text>
          </View>
          <View style={styles.headerActions}>
            <PressableIcon style={styles.iconButton} onPress={() => router.push('/_hidden/wishlist')}>
              <Ionicons name="heart-outline" size={24} color="#fff" />
            </PressableIcon>
            <PressableIcon style={styles.iconButton} onPress={() => router.push('/(routes)/notifications')}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </PressableIcon>
            <PressableIcon style={styles.cartButton} onPress={() => router.push('/_hidden/cart')}>
              <Ionicons name="cart-outline" size={24} color="#fff" />
              {items.length > 0 && (
                <Animated.View style={[styles.badge, badgeStyle]}>
                  <Text style={styles.badgeText}>{items.length}</Text>
                </Animated.View>
              )}
            </PressableIcon>
          </View>
        </Animated.View>

        {/* Search */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8, marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#FF8C00"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ padding: 8 }}>
            <Ionicons name="options-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {/* Categories */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
              {categories.map((cat, i) => {
                const isActive = activeCategory === cat.id;
                return (
                  <Animated.View key={cat.id} entering={ZoomIn.delay(i * 60)}>
                    <TouchableOpacity
                      style={[styles.categoryItem, isActive && styles.activeCategory]}
                      onPress={() => setActiveCategory(cat.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name={cat.icon as any} size={16} color={isActive ? '#FF8C00' : '#fff'} />
                      <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>{cat.name}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Verified Sellers */}
          {verifiedSellers.length > 0 && (
            <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.promotedSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>✅ Verified Sellers</Text>
                <TouchableOpacity onPress={() => router.push('/(routes)/sellers' as any)}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promotedList}>
                {verifiedSellers.map((item, i) => <SellerCard key={item._id} item={item} index={i} />)}
              </ScrollView>
            </Animated.View>
          )}

          {/* Products */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'All' ? '🔥 Featured Products' : `📦 ${activeCategory}`}
              </Text>
              {hasMore && !loading && (
                <TouchableOpacity onPress={() => router.push({ pathname: '/(routes)/products', params: { search: '' } } as any)}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading && page === 1 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8C00" />
                <Text style={styles.loadingText}>Finding amazing deals...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or category</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {products.map((item, index) => (
                  <Animated.View
                    key={`${item._id}-${index}`}
                    entering={FadeInDown.delay(index * 60).springify()}
                    style={styles.productWrapper}
                  >
                    <ProductCard
                      item={item}
                      wishlist={wishlistIds}
                      toggleWishlist={toggleWishlist}
                      addToCart={addToCart}
                      index={index}
                    />
                  </Animated.View>
                ))}
              </View>
            )}

            {!loading && hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => fetchProducts(page + 1)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      <FilterModal
        isVisible={isFilterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(f) => { setFilters(f); setFilterVisible(false); }}
        currentFilters={filters}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  cartButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, marginBottom: 20, height: 50 },
  searchInput: { flex: 1, height: '100%', color: '#111827' },
  categoriesList: { paddingHorizontal: 20, marginBottom: 24, gap: 10 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  activeCategory: { backgroundColor: '#fff' },
  categoryText: { color: '#fff', marginLeft: 6, fontWeight: '600', fontSize: 13 },
  activeCategoryText: { color: '#FF8C00' },
  productsSection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productWrapper: { width: '48%', marginBottom: 16 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptySubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  promotedSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  seeAllText: { color: '#FFD700', fontWeight: '600' },
  promotedList: { paddingHorizontal: 20, gap: 12 },
  promotedCard: { width: 150, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, overflow: 'hidden' },
  promotedImage: { width: '100%', height: 110 },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  verifiedText: { fontSize: 10, fontWeight: 'bold', color: '#10B981', marginLeft: 2 },
  promotedDetails: { padding: 10 },
  promotedName: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  promotedSeller: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  promotedRating: { fontSize: 11, color: '#FF8C00', fontWeight: '600' },
  promotedPrice: { fontSize: 12, color: '#FF8C00', fontWeight: 'bold' },
  loadMoreButton: { backgroundColor: '#fff', paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginTop: 20, marginBottom: 20, alignSelf: 'center', paddingHorizontal: 30 },
  loadMoreText: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
});
