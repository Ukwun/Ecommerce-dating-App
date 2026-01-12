import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/AuthContext';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { ProductCard } from '@/components/home/products';
import axiosInstance from '@/utils/axiosinstance';
import FilterModal, { Filters } from '../(routes)/products/filter-modal';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

// Mock data for Verified Sellers
const verifiedProducts = [
  { _id: 'v1', name: 'MacBook Pro M2', price: 1200000, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=500', seller: 'Apple Store', verified: true },
  { _id: 'v2', name: 'Nike Air Jordan', price: 150000, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', seller: 'Kicks Nation', verified: true },
  { _id: 'v3', name: 'Sony A7III', price: 950000, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500', seller: 'Camera Hub', verified: true },
];

const fallbackProducts = [
  { _id: '1', name: 'Wireless Headphones', price: 45000, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', rating: 4.5, description: 'High quality sound', category: 'Audio', stock: 5 },
  { _id: '2', name: 'Smart Watch Series 5', price: 85000, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', rating: 4.2, description: 'Stay connected', category: 'Wearables', stock: 12 },
  { _id: '3', name: 'Running Sneakers', price: 32000, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', rating: 4.8, description: 'Comfortable for running', category: 'Fashion', stock: 3 },
  { _id: '4', name: 'Leather Backpack', price: 28000, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', rating: 4.3, description: 'Stylish and durable', category: 'Accessories', stock: 20 },
];

const categories = [
  { id: '1', name: 'All', icon: 'grid' },
  { id: '2', name: 'Tech', icon: 'smartphone' },
  { id: '3', name: 'Fashion', icon: 'watch' },
  { id: '4', name: 'Home', icon: 'home' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const { items, addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (pageNum === 1 && !shouldRefresh) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);

      const params = new URLSearchParams();
      params.append('limit', '10');
      params.append('page', pageNum.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (filters.sortBy) params.append('sort', filters.sortBy);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.color) params.append('color', filters.color);
      if (filters.size) params.append('size', filters.size);

      const response = await axiosInstance.get(`/marketplace/api/products?${params.toString()}`);
      const fetchedData = response.data.data || [];

      const mappedProducts = fetchedData.map((p: any) => ({
        ...p,
        name: p.title,
        image: p.thumbnail || p.images?.[0]?.url || p.images?.[0] || 'https://via.placeholder.com/150',
        rating: p.ratings || 0
      }));

      if (fetchedData.length < 10) {
        setHasMore(false);
      }

      if (pageNum === 1) {
        if (mappedProducts.length === 0) {
          setProducts(fallbackProducts);
          setHasMore(false);
        } else {
          setProducts(mappedProducts);
        }
      } else {
        setProducts(prev => [...prev, ...mappedProducts]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch products', error);
      if (pageNum === 1) {
        setProducts(fallbackProducts);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1);
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <MotiView 
          from={{ opacity: 0, translateY: -20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'timing', duration: 500 }}
          style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'User'}!</Text>
            <Text style={styles.subGreeting}>What are you looking for?</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/wishlist' as any)}>
              <Ionicons name="heart-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/_hidden/cart')}>
              <Ionicons name="cart-outline" size={24} color="#fff" />
              {items.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{items.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* Search */}
        <MotiView 
          from={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ type: 'timing', duration: 500, delay: 100 }}
          style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8, marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ padding: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="options-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </MotiView>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {/* Categories */}
          <MotiView 
            from={{ opacity: 0, translateX: -20 }} 
            animate={{ opacity: 1, translateX: 0 }} 
            transition={{ type: 'timing', duration: 500, delay: 200 }}
          >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryItem, activeCategory === cat.name && styles.activeCategory]}
                onPress={() => setActiveCategory(cat.name)}
              >
                <Feather name={cat.icon as any} size={18} color={activeCategory === cat.name ? '#FF8C00' : '#fff'} />
                <Text style={[styles.categoryText, activeCategory === cat.name && styles.activeCategoryText]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </MotiView>

          {/* Verified Sellers Section */}
          <MotiView 
            from={{ opacity: 0, translateY: 20 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            transition={{ type: 'timing', duration: 500, delay: 300 }}
            style={styles.promotedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verified Sellers</Text>
              <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promotedList}>
              {verifiedProducts.map((item) => (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.promotedCard}
                  onPress={() => router.push({
                    pathname: '/seller/[sellerId]',
                    params: { sellerId: item._id, name: item.seller, avatar: item.image }
                  })}
                >
                  <Image source={{ uri: item.image }} style={styles.promotedImage} />
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                  <View style={styles.promotedDetails}>
                    <Text style={styles.promotedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.promotedSeller} numberOfLines={1}>{item.seller}</Text>
                    <Text style={styles.promotedPrice}>₦{item.price.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </MotiView>

          {/* Products */}
          <MotiView 
            from={{ opacity: 0, translateY: 20 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            transition={{ type: 'timing', duration: 500, delay: 400 }}
            style={styles.productsSection}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            {loading && page === 1 ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.grid}>
                {products.map((item, index) => (
                  <View 
                    key={`${item._id}-${index}`}
                    style={styles.productWrapper}
                  >
                    <ProductCard
                      item={item}
                      wishlist={wishlistIds}
                      toggleWishlist={toggleWishlist}
                      addToCart={addToCart}
                      index={index}
                    />
                  </View>
                ))}
              </View>
            )}
            {!loading && hasMore && (
              <TouchableOpacity 
                style={styles.loadMoreButton} 
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </MotiView>
        </ScrollView>
      </SafeAreaView>
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
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, marginBottom: 20, height: 50 },
  searchInput: { flex: 1, height: '100%', color: '#111827' },
  categoriesList: { paddingHorizontal: 20, marginBottom: 24 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 12 },
  activeCategory: { backgroundColor: '#fff' },
  categoryText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  activeCategoryText: { color: '#FF8C00' },
  productsSection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productWrapper: { width: '48%', marginBottom: 16, height: 260 },
  promotedSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  seeAllText: { color: '#FFD700', fontWeight: '600' },
  promotedList: { paddingHorizontal: 20 },
  promotedCard: { width: 160, marginRight: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, overflow: 'hidden' },
  promotedImage: { width: '100%', height: 120 },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  verifiedText: { fontSize: 10, fontWeight: 'bold', color: '#10B981', marginLeft: 2 },
  promotedDetails: { padding: 12 },
  promotedName: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  promotedSeller: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  promotedPrice: { fontSize: 14, fontWeight: 'bold', color: '#FF8C00' },
  loadMoreButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 30,
  },
  loadMoreText: {
    color: '#111827',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confetti: {
    width: 400,
    height: 400,
  },
});