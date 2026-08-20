import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Dimensions, Modal, Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axiosInstance from '@/utils/axiosinstance';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProductSkeleton from '../../../components/skeleton/product.skeleton';
import ReviewModal from '../../../components/product/ReviewModal';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useAuth } from '@/hooks/AuthContext';
import Toast from 'react-native-toast-message';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeInDown, FadeInUp, ZoomIn, SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

let PaystackWebView: any = null;
const PAYSTACK_KEY = '';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 380;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function PressBtn({ onPress, style, children, disabled }: any) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: disabled ? 0.6 : 1 }));
  return (
    <AnimatedTouchable
      style={[aStyle, style]}
      onPressIn={() => { if (!disabled) scale.value = withSpring(0.94); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={disabled ? undefined : onPress}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showPaystack, setShowPaystack] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addProductToRecentlyViewed } = useRecentlyViewed();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const isWishlisted = wishlistIds.includes(id || '');

  // Animations
  const cartBtnScale = useSharedValue(1);
  const wishlistScale = useSharedValue(1);
  const footerY = useSharedValue(100);
  const footerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: footerY.value }] }));
  const cartBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartBtnScale.value }] }));
  const wishlistStyle = useAnimatedStyle(() => ({ transform: [{ scale: wishlistScale.value }] }));

  useEffect(() => {
    footerY.value = withSpring(0, { damping: 18 });
  }, [footerY]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    axiosInstance.get(`/marketplace/api/products/${id}`)
      .then(res => {
        if (!mounted) return;
        const p = res.data?.data || res.data;
        p.images = p.images?.length > 0 ? p.images : (p.image ? [{ url: p.image }] : []);
        p.colors = p.colors || [];
        p.sizes = p.sizes || [];
        p.reviews = p.latestReviews || p.reviews || [];
        setProduct(p);
        setSelectedColor(p.colors[0] || '');
        setSelectedSize(p.sizes[0] || '');
      })
      .catch(() => setProduct(null))
      .finally(() => { if (mounted) setLoading(false); });
    return () => {
      mounted = false;
      if (id) addProductToRecentlyViewed(id);
    };
  }, [addProductToRecentlyViewed, id]);

  const { data: similarProducts, isLoading: isLoadingSimilar } = useQuery({
    queryKey: ['similar', id, product?.category],
    queryFn: async () => {
      const res = await axiosInstance.get('/marketplace/api/products', { params: { limit: 6, category: product.category } });
      return (res.data?.data ?? []).filter((p: any) => p._id !== id);
    },
    enabled: !!product,
  });

  const queryClient = useQueryClient();
  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) =>
      axiosInstance.post(`/marketplace/api/products/${id}/reviews`, { rating, comment }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      Toast.show({ type: 'success', text1: 'Review Submitted!', text2: 'Thank you for your feedback.' });
      setReviewModalVisible(false);
      // Refresh product reviews
      axiosInstance.get(`/marketplace/api/products/${id}`).then(res => {
        const p = res.data?.data || res.data;
        setProduct((prev: any) => ({ ...prev, reviews: p.reviews || prev.reviews }));
      });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to submit review' });
      setReviewModalVisible(false);
    },
  });

  const handleAddToCart = () => {
    if (product?.inStock === false || product.stock <= 0) return Toast.show({ type: 'error', text1: 'Out of stock', text2: 'This product cannot be added right now.' });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cartBtnScale.value = withSpring(1.2, {}, () => { cartBtnScale.value = withSpring(1); });
    addToCart({ ...product, selectedColor, selectedSize });
    setAddedToCart(true);
    Toast.show({ type: 'success', text1: '🛒 Added to Cart!', text2: product.name });
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    wishlistScale.value = withSpring(1.3, {}, () => { wishlistScale.value = withSpring(1); });
    toggleWishlist(id || '');
  };

  const handleChatSeller = () => {
    if (!product?.seller?._id) return Toast.show({ type: 'error', text1: 'Seller info unavailable' });
    router.push({ pathname: '/(routes)/chat/[id]', params: { id: product.seller._id, name: product.seller.name, avatar: product.seller.avatar } } as any);
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${product.name} for ₦${product.price.toLocaleString()} on Marketplace!` });
  };

  const handleBuyNow = () => {
    if (product?.inStock === false || product.stock <= 0) return Toast.show({ type: 'error', text1: 'Out of stock', text2: 'This product cannot be ordered right now.' });
    addToCart({ ...product, selectedColor, selectedSize });
    router.push('/_hidden/checkout');
  };

  const imageUrls: string[] = product?.images?.map((img: any) => img.url || img) || [];

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF8C00" />
      <Text style={{ color: '#888', marginTop: 12 }}>Loading product...</Text>
    </View>
  );
  if (!product) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
      <Text style={{ color: '#888', marginTop: 12 }}>Product not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backFallback}>
        <Text style={{ color: '#FF8C00', fontWeight: '600' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Paystack Modal */}
      {showPaystack && PaystackWebView && user && (
        <Modal visible={showPaystack} animationType="slide">
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setShowPaystack(false)} style={styles.closePaystack}>
              <Ionicons name="close" size={28} color="#111" />
            </TouchableOpacity>
            <PaystackWebView
              paystackKey={PAYSTACK_KEY}
              amount={product.price}
              billingEmail={user.email}
              billingName={user.name}
              currency="NGN"
              onCancel={() => setShowPaystack(false)}
              onSuccess={() => {
                setShowPaystack(false);
                router.push('/(routes)/order-confirmation');
                Toast.show({ type: 'success', text1: '🎉 Payment Successful!', text2: 'Your order has been placed.' });
              }}
              activityIndicatorColor="#FF8C00"
            />
          </SafeAreaView>
        </Modal>
      )}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={{ height: IMAGE_HEIGHT }}>
          <FlatList
            data={imageUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width, height: IMAGE_HEIGHT }} resizeMode="cover" />
            )}
          />
          {/* Dots */}
          {imageUrls.length > 1 && (
            <View style={styles.imageDots}>
              {imageUrls.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImageIndex && styles.activeDot]} />
              ))}
            </View>
          )}
          {/* Top Actions */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topRightActions}>
            <AnimatedTouchable onPress={handleWishlist} style={[styles.topActionBtn, wishlistStyle]}>
              <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={22} color={isWishlisted ? '#EF4444' : '#fff'} />
            </AnimatedTouchable>
            <TouchableOpacity onPress={handleShare} style={styles.topActionBtn}>
              <Feather name="share-2" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {product.stock <= 5 && product.stock > 0 && (
            <View style={styles.stockBanner}>
              <Text style={styles.stockBannerText}>⚡ Only {product.stock} left!</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.detailsContainer}>
          {/* Title & Price */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{product.name ?? product.title}</Text>
            <View style={styles.ratingChip}>
              <AntDesign name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingChipText}>{product.ratings?.toFixed(1) || '4.5'}</Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₦{Number(product.price ?? 0).toLocaleString()}</Text>
            {product.oldPrice > product.price && (
              <>
                <Text style={styles.oldPrice}>₦{Number(product.oldPrice).toLocaleString()}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Seller Card */}
          {product.seller && (
            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.sellerCard}>
              <TouchableOpacity
                style={styles.sellerInfo}
                onPress={() => router.push({ pathname: '/(routes)/seller/[sellerId]', params: { sellerId: product.seller._id, name: product.seller.name } } as any)}
              >
                {(product.seller.avatar?.url || product.seller.avatar) ? (
                  <Image source={{ uri: product.seller.avatar?.url || product.seller.avatar }} style={styles.sellerAvatar} />
                ) : (
                  <View style={[styles.sellerAvatar, styles.sellerAvatarFallback]}>
                    <Text style={styles.sellerInitial}>{(product.seller.name || 'S').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{product.seller.name || 'Marketplace Seller'}</Text>
                  <Text style={styles.sellerSub}>View seller profile →</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChatSeller} style={styles.chatSellerBtn}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.chatSellerText}>Chat</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Color Selector */}
          <Text style={styles.sectionTitle}>Color</Text>
          <View style={styles.selectorContainer}>
            {product.colors.map((color: string) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColorOption]}
                onPress={() => { Haptics.selectionAsync(); setSelectedColor(color); }}
              >
                {selectedColor === color && <Ionicons name="checkmark" size={16} color={color === '#FFFFFF' ? '#000' : '#fff'} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Size Selector */}
          <Text style={styles.sectionTitle}>Size</Text>
          <View style={styles.selectorContainer}>
            {product.sizes.map((size: string) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeOption, selectedSize === size && styles.selectedSizeOption]}
                onPress={() => { Haptics.selectionAsync(); setSelectedSize(size); }}
              >
                <Text style={[styles.sizeText, selectedSize === size && styles.selectedSizeText]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.desc}>{product.description || 'No description available.'}</Text>

          {/* Delivery Info */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.deliveryCard}>
            <Ionicons name="cube-outline" size={20} color="#10B981" />
            <Text style={styles.deliveryText}>Free delivery on orders above ₦50,000</Text>
          </Animated.View>

          {/* Reviews */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Reviews ({product.reviews?.length || 0})</Text>
            <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
              <Text style={styles.writeReviewBtn}>+ Write a Review</Text>
            </TouchableOpacity>
          </View>
          {product.reviews?.length === 0 ? (
            <Text style={styles.noReviews}>Be the first to review this product!</Text>
          ) : (
            product.reviews?.slice(0, 3).map((review: any, i: number) => (
              <Animated.View key={review._id || review.id || i} entering={FadeInDown.delay(i * 80).springify()} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{review.user?.name || review.user || 'Anonymous'}</Text>
                  <View style={styles.ratingRow}>
                    {[...Array(5)].map((_, j) => (
                      <AntDesign key={j} name="star" size={12} color={j < (review.rating || 0) ? '#FFD700' : '#E5E7EB'} />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </Animated.View>
            ))
          )}

          {/* Similar Products */}
          <Text style={styles.sectionTitle}>Similar Products</Text>
          {isLoadingSimilar ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <ProductSkeleton /><ProductSkeleton />
            </View>
          ) : (
            <FlatList
              horizontal
              data={similarProducts}
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
              renderItem={({ item, index }) => (
                <Animated.View entering={SlideInRight.delay(index * 80)}>
                  <TouchableOpacity style={styles.recCard} onPress={() => router.push(`/(routes)/product/${item._id}` as any)}>
                    <Image source={{ uri: item.image || item.images?.[0]?.url }} style={styles.recImage} />
                    <Text style={styles.recName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.recPrice}>₦{item.price?.toLocaleString()}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer Actions */}
      <Animated.View style={[styles.footer, footerStyle]}>
        <AnimatedTouchable
          style={[styles.cartBtn, cartBtnStyle, addedToCart && styles.cartBtnAdded]}
          onPressIn={() => { cartBtnScale.value = withSpring(0.9); }}
          onPressOut={() => { cartBtnScale.value = withSpring(1); }}
          onPress={handleAddToCart}
          disabled={product.inStock === false || product.stock <= 0}
          activeOpacity={1}
        >
          <Ionicons name={addedToCart ? 'checkmark' : 'cart-outline'} size={24} color={addedToCart ? '#10B981' : '#FF8C00'} />
        </AnimatedTouchable>

        <TouchableOpacity style={[styles.buyNowBtn, (product.inStock === false || product.stock <= 0) && { opacity: 0.5 }]} onPress={handleBuyNow} disabled={product.inStock === false || product.stock <= 0}>
          <LinearGradient colors={['#FF8C00', '#FF5F6D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyNowGradient}>
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={styles.buyNowText}>Buy Now · ₦{Number(product.price).toLocaleString()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ReviewModal
        visible={isReviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={(rating: number, comment: string) => reviewMutation.mutate({ rating, comment })}
        isSubmitting={reviewMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 110 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  backFallback: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FF8C00' },
  imageDots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeDot: { width: 18, backgroundColor: '#fff' },
  backButton: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.45)', padding: 8, borderRadius: 20 },
  topRightActions: { position: 'absolute', top: 16, right: 16, gap: 10 },
  topActionBtn: { backgroundColor: 'rgba(0,0,0,0.45)', padding: 8, borderRadius: 20 },
  stockBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(239,68,68,0.85)', paddingVertical: 6, alignItems: 'center' },
  stockBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  detailsContainer: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', flex: 1, marginRight: 12 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  ratingChipText: { fontSize: 12, fontWeight: 'bold', color: '#92400E' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  price: { fontSize: 24, color: '#FF8C00', fontWeight: 'bold' },
  oldPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  discountText: { fontSize: 12, color: '#16A34A', fontWeight: 'bold' },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, marginBottom: 20, gap: 12 },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB' },
  sellerAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  sellerInitial: { color: '#6B7280', fontWeight: '900', fontSize: 18 },
  sellerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sellerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chatSellerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF8C00', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, gap: 6 },
  chatSellerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 12 },
  selectorContainer: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  colorOption: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  selectedColorOption: { borderWidth: 3, borderColor: '#FF8C00' },
  sizeOption: { paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10 },
  selectedSizeOption: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  sizeText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  selectedSizeText: { color: '#fff' },
  desc: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  deliveryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginTop: 16, gap: 10 },
  deliveryText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  writeReviewBtn: { color: '#FF8C00', fontWeight: '700', fontSize: 14 },
  noReviews: { color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 },
  reviewItem: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewUser: { fontWeight: 'bold', color: '#111827', fontSize: 14 },
  ratingRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: '#4B5563', fontSize: 14, lineHeight: 20 },
  recCard: { width: 150, backgroundColor: '#F9FAFB', borderRadius: 12, overflow: 'hidden' },
  recImage: { width: '100%', height: 110 },
  recName: { paddingHorizontal: 8, paddingTop: 6, fontWeight: '600', color: '#374151', fontSize: 13 },
  recPrice: { paddingHorizontal: 8, paddingBottom: 8, fontWeight: 'bold', color: '#FF8C00', fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  cartBtn: { borderWidth: 2, borderColor: '#FF8C00', borderRadius: 14, padding: 14, justifyContent: 'center', alignItems: 'center', width: 54 },
  cartBtnAdded: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  buyNowBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  buyNowGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  buyNowText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closePaystack: { padding: 16, alignItems: 'flex-end' },
});
