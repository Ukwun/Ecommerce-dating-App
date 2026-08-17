import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity,
  ActivityIndicator, Dimensions, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle,
  withSpring, ZoomIn, SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { ProductCard } from '@/components/home/products';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';

const { width } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SellerProfileScreen() {
  const { sellerId, name, avatar } = useLocalSearchParams<{ sellerId: string; name?: string; avatar?: string }>();
  const router = useRouter();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const followScale = useSharedValue(1);
  const followStyle = useAnimatedStyle(() => ({ transform: [{ scale: followScale.value }] }));

  // Fetch seller profile + their products
  const { data: sellerData, isLoading: loadingSeller } = useQuery({
    queryKey: ['sellerProfile', sellerId],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/seller/api/profiles/${sellerId}`);
        return res.data.data;
      } catch {
        return null;
      }
    },
    enabled: !!sellerId,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['sellerProducts', sellerData?.userId?._id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/marketplace/api/products?seller=${sellerData.userId._id}`);
      return (res.data.data || []).map((p: any) => ({
        ...p,
        name: p.name || p.title,
        image: p.thumbnail || p.images?.[0]?.url || p.images?.[0] || '',
        rating: p.ratings || 0,
      }));
    },
    enabled: !!sellerData?.userId?._id,
  });

  const { data: ratings } = useQuery({
    queryKey: ['sellerRatings', sellerId],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/marketplace/api/seller-ratings/${sellerId}`);
        return res.data.data || { averageRating: 0, totalRatings: 0, ratings: [] };
      } catch {
        return { averageRating: 0, totalRatings: 0, ratings: [] };
      }
    },
    enabled: !!sellerId,
  });

  useEffect(() => {
    axiosInstance.get(`/seller/api/profiles/${sellerId}/follow-status`)
      .then(response => setIsFollowing(Boolean(response.data?.following)))
      .catch(() => setIsFollowing(false));
  }, [sellerId]);

  const handleFollow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    followScale.value = withSpring(1.2, {}, () => { followScale.value = withSpring(1); });
    const next = !isFollowing;
    try {
      if (next) await axiosInstance.post(`/seller/api/profiles/${sellerId}/follow`);
      else await axiosInstance.delete(`/seller/api/profiles/${sellerId}/follow`);
      setIsFollowing(next);
    Toast.show({
      type: 'success',
      text1: next ? '✅ Following seller' : 'Unfollowed',
      text2: next ? `You'll see ${name || 'this seller'}'s new listings first` : '',
      });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not update follow', text2: error?.response?.data?.error || 'Try again.' });
    }
  };

  const handleChatSeller = () => {
    router.push({
      pathname: '/(routes)/chat/[id]',
      params: { id: sellerData?.userId?._id, name: sellerData?.businessName || sellerData?.userId?.name || 'Seller', avatar: sellerData?.userId?.avatar || '' },
    } as any);
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${name || 'this seller'} on Marketplace! They have amazing products 🛍️` });
  };

  const sellerName = sellerData?.businessName || sellerData?.userId?.name || name || 'Verified Seller';
  const sellerAvatar = sellerData?.userId?.avatar || avatar;
  const avgRating = ratings?.averageRating || sellerData?.averageRating || 0;
  const totalRatings = ratings?.totalRatings || sellerData?.totalRatings || 0;
  const totalSales = sellerData?.totalSales || 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {/* Hero Header */}
            <LinearGradient colors={['#FF8C00', '#4B2E05']} style={styles.heroGradient}>
              <SafeAreaView>
                <View style={styles.headerRow}>
                  <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
                    <Feather name="share-2" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              {/* Profile Card */}
              <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.profileCard}>
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: sellerAvatar }} style={styles.avatar} />
                  <View style={styles.verifiedDot}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                </View>

                <Text style={styles.sellerName}>{sellerName}</Text>
                {sellerData?.businessCategory && (
                  <Text style={styles.sellerCategory}>{sellerData.businessCategory}</Text>
                )}

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{products.length}</Text>
                    <Text style={styles.statLabel}>Products</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{totalSales > 0 ? `${totalSales}+` : totalRatings}</Text>
                    <Text style={styles.statLabel}>{totalSales > 0 ? 'Sales' : 'Reviews'}</Text>
                  </View>
                </View>

                {/* Star Rating */}
                {avgRating > 0 && (
                  <Animated.View entering={ZoomIn.delay(300)} style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons key={i} name={i <= Math.round(avgRating) ? 'star' : 'star-outline'} size={18} color="#FFD700" />
                    ))}
                    <Text style={styles.ratingCount}>({totalRatings})</Text>
                  </Animated.View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <AnimatedTouchable
                    style={[styles.followBtn, isFollowing && styles.followBtnActive, followStyle]}
                    onPress={handleFollow}
                    activeOpacity={1}
                  >
                    <Ionicons name={isFollowing ? 'person-remove' : 'person-add'} size={16} color={isFollowing ? '#FF8C00' : '#fff'} />
                    <Text style={[styles.followBtnText, isFollowing && { color: '#FF8C00' }]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </AnimatedTouchable>

                  <TouchableOpacity style={styles.chatBtn} onPress={handleChatSeller}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                    <Text style={styles.chatBtnText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </LinearGradient>

            {/* Products Header */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.productsHeader}>
              <Text style={styles.productsTitle}>
                Products <Text style={styles.productsCount}>({products.length})</Text>
              </Text>
            </Animated.View>

            {loadingProducts && (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF8C00" />
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={{ width: '48%', marginBottom: 16 }}>
            <ProductCard item={item} wishlist={wishlistIds} toggleWishlist={toggleWishlist} addToCart={addToCart} index={index} />
          </Animated.View>
        )}
        ListEmptyComponent={
          !loadingProducts ? (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyProducts}>
              <MaterialCommunityIcons name="package-variant-closed" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products listed yet</Text>
            </Animated.View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroGradient: { paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  headerBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  profileCard: { backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FF8C00' },
  verifiedDot: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  sellerName: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  sellerCategory: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 18 },
  ratingCount: { fontSize: 13, color: '#9CA3AF', marginLeft: 6 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  followBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF8C00', paddingVertical: 12, borderRadius: 14 },
  followBtnActive: { backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#FF8C00' },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 14 },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  productsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  productsTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  productsCount: { color: '#9CA3AF', fontWeight: '500' },
  emptyProducts: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
