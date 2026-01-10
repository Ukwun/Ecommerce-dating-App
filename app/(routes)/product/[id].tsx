import React, { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Dimensions } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import axiosInstance from '@/utils/axiosinstance'
import { useCart } from '@/hooks/CartContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, AntDesign } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MotiView, AnimatePresence } from 'moti'
import ProductSkeleton from '../../../components/skeleton/product.skeleton'
import ReviewModal from '../../../components/product/ReviewModal'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useSharedElement } from '@/hooks/useSharedElement';
import Toast from 'react-native-toast-message'

// Mock Data for demonstration
const MOCK_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const MOCK_COLORS = ['#FF8C00', '#111827', '#FFFFFF', '#4B5563', '#DC2626'];
const MOCK_REVIEWS = [
  { id: '1', user: 'John D.', rating: 5, comment: 'Excellent quality, fast shipping!' },
  { id: '2', user: 'Jane S.', rating: 4, comment: 'Looks great, but the size runs a bit small.' },
];

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 400;

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>(MOCK_COLORS[0]);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>(MOCK_SIZES[2]);
  const { addProductToRecentlyViewed } = useRecentlyViewed();
  const { sharedElement, setSharedElement } = useSharedElement();
  const { addToCart } = useCart();

  useEffect(() => {
    if (!id) return
    let mounted = true
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const res = await axiosInstance.get(`/product/api/get-product/${id}`)
        if (mounted) {
          const fetchedProduct = res.data?.product ?? res.data;
          // Add mock data to the product if it doesn't exist
          fetchedProduct.colors = fetchedProduct.colors || MOCK_COLORS;
          fetchedProduct.sizes = fetchedProduct.sizes || MOCK_SIZES;
          fetchedProduct.reviews = fetchedProduct.reviews || MOCK_REVIEWS;
          setProduct(fetchedProduct);
        }
      } catch (err) {
        console.error('Failed to fetch product', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchProduct()
    return () => {
      if (id) addProductToRecentlyViewed(id);
      mounted = false
    }
  }, [id])

  // Clear shared element after transition
  useEffect(() => {
    if (product) setTimeout(() => setSharedElement(null, null), 400);
  }, [product]);

  // Fetch recommended products
  const { data: recommendedProducts, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['recommendedProducts', id],
    queryFn: async () => {
      const response = await axiosInstance.get('/product/api/get-all-products', { params: { limit: 6 } });
      // Filter out the current product from recommendations
      return (response.data?.products ?? []).filter((p: any) => p._id !== id);
    },
  });

  const handleBuyNow = () => {
    addToCart(product);
    router.push('/_hidden/checkout');
  };

  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment: string }) => {
      // In a real app, you'd post to your backend.
      // We'll simulate this and just invalidate the query to refetch.
      console.log('Submitting review:', { productId: id, rating, comment });
      return axiosInstance.post(`/product/api/rate-product`, { productId: id, rating, comment });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Review Submitted!', text2: 'Thank you for your feedback.' });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      setReviewModalVisible(false);
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: error.message || 'Could not submit your review.' });
      setReviewModalVisible(false);
    },
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF8C00" /></View>
  if (!product) return <View style={styles.center}><Text>Product not found</Text></View>

  return (
    <SafeAreaView style={styles.safeArea}>      
      <AnimatePresence>
        {sharedElement.item && sharedElement.sourceLayout && (
          <MotiView
            from={{
              left: sharedElement.sourceLayout.x,
              top: sharedElement.sourceLayout.y,
              width: sharedElement.sourceLayout.width,
              height: sharedElement.sourceLayout.height,
              position: 'absolute',
              zIndex: 10,
              borderRadius: 14,
            }}
            animate={{
              left: 0,
              top: 0,
              width: width,
              height: IMAGE_HEIGHT,
              borderRadius: 0,
            }}
            transition={{
              type: 'timing',
              duration: 500,
            }}
            style={styles.sharedImage}
          >
            <Image source={{ uri: sharedElement.item.image }} style={styles.image} />
          </MotiView>
        )}
      </AnimatePresence>

      <ScrollView contentContainerStyle={styles.container} style={{ opacity: sharedElement.item ? 0 : 1 }}>
        <Image source={{ uri: product.image || product.images?.[0]?.url }} style={styles.image} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.detailsContainer}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 300 }}
          >
            <Text style={styles.title}>{product.name ?? product.title}</Text>
          </MotiView>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
          >
            <Text style={styles.price}>₦{Number(product.price ?? product.regular_price ?? 0).toLocaleString()}</Text>
          </MotiView>

          {/* Color Selector */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 500 }}
          >
            <Text style={styles.sectionTitle}>Color</Text>
          </MotiView>
          <View style={styles.selectorContainer}>
            {product.colors.map((color: string) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedOption]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && <Ionicons name="checkmark" size={18} color={color === '#FFFFFF' ? '#000' : '#fff'} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Size Selector */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 600 }}
          >
            <Text style={styles.sectionTitle}>Size</Text>
          </MotiView>
          <View style={styles.selectorContainer}>
            {product.sizes.map((size: string) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeOption, selectedSize === size && styles.selectedSizeOption]}
                onPress={() => setSelectedSize(size)}
              >
                <Text style={[styles.sizeText, selectedSize === size && styles.selectedSizeText]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 700 }}
          >
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.desc}>{product.description ?? product.long_description ?? ''}</Text>
          </MotiView>

          {/* Reviews */}
          <View style={styles.sectionHeader}>
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 800 }}
            >
              <Text style={styles.sectionTitle}>Reviews ({product.reviews.length})</Text>
            </MotiView>
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 900 }}>
              <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                <Text style={styles.writeReviewButton}>Write a Review</Text>
              </TouchableOpacity>
            </MotiView>
          </View>
          <View style={styles.reviewsContainer}>
            {product.reviews.map((review: any) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{review.user}</Text>
                  <View style={styles.ratingRow}>
                    {[...Array(5)].map((_, i) => <AntDesign key={i} name="star" size={14} color={i < review.rating ? '#FFD700' : '#E5E7EB'} />)}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 900 }}
          >
            <Text style={styles.sectionTitle}>You Might Also Like</Text>
          </MotiView>
          {isLoadingRecommendations ? (
            <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16 }}>
              <ProductSkeleton /><ProductSkeleton />
            </View>
          ) : (
            <FlatList
              horizontal
              data={recommendedProducts}
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.recommendationCard} onPress={() => router.push(`/product/${item._id}`)}>
                  <Image source={{ uri: item.image || item.images?.[0]?.url }} style={styles.recommendationImage} />
                  <Text style={styles.recommendationName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.recommendationPrice}>₦{item.price.toLocaleString()}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </ScrollView>

      {product && (
        <View style={styles.footer}>
          <MotiView
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
          >
            <TouchableOpacity style={styles.cartButton} onPress={() => addToCart(product)}>
              <Ionicons name="cart-outline" size={24} color="#FF8C00" />
            </TouchableOpacity>
          </MotiView>
          <MotiView
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 200 }}
          >
            <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow}>
              <Text style={styles.buyNowButtonText}>Buy Now</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      )}
      <View>
        <ReviewModal
          visible={isReviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          onSubmit={(rating: number, comment: string) => reviewMutation.mutate({ rating, comment })}
          isSubmitting={reviewMutation.isPending}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 100 },
  image: { width: '100%', height: IMAGE_HEIGHT },
  sharedImage: { width: '100%', height: '100%', overflow: 'hidden' },
  backButton: { position: 'absolute', top: 50, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  detailsContainer: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  price: { fontSize: 22, color: '#FF8C00', fontWeight: 'bold', marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  writeReviewButton: { color: '#FF8C00', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 12 },
  selectorContainer: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  selectedOption: { borderWidth: 2, borderColor: '#FF8C00' },
  sizeOption: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  selectedSizeOption: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  sizeText: { fontSize: 14, color: '#374151' },
  selectedSizeText: { color: '#fff', fontWeight: 'bold' },
  desc: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
  reviewsContainer: { gap: 16 },
  reviewItem: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewUser: { fontWeight: 'bold', color: '#111827' },
  ratingRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: '#4B5563' },
  recommendationCard: { width: 160, marginRight: 16, backgroundColor: '#F9FAFB', borderRadius: 8, overflow: 'hidden' },
  recommendationImage: { width: '100%', height: 120 },
  recommendationName: { paddingHorizontal: 8, paddingTop: 6, fontWeight: '600', color: '#374151' },
  recommendationPrice: { paddingHorizontal: 8, paddingBottom: 8, fontWeight: 'bold', color: '#FF8C00' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cartButton: { borderWidth: 2, borderColor: '#FF8C00', borderRadius: 12, padding: 14, justifyContent: 'center', alignItems: 'center' },
  buyNowButton: { flex: 1, backgroundColor: '#FF8C00', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buyNowButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
