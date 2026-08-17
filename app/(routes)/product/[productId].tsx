import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import axiosInstance from '@/utils/axiosinstance';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

export default function ProductDetailsScreen() {
  const { productId } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  
  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [addingToCart, setAddingToCart] = useState(false);

  const sizes = product?.sizes || ['S', 'M', 'L', 'XL'];
  const colors = product?.colors || ['#000000', '#FFFFFF', '#FF0000', '#0000FF'];

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await axiosInstance.get(`/marketplace/api/products/${productId}`);
        const data = response.data.data || response.data;
        
        const normalizedImages = Array.isArray(data.images)
          ? data.images
              .map((img: any) => (typeof img === 'string' ? img : img?.url))
              .filter(Boolean)
          : [];
        
        setProduct({
            ...data,
            name: data.title || data.name,
            image: data.thumbnail || normalizedImages[0] || 'https://via.placeholder.com/300',
            images: normalizedImages.length ? normalizedImages : (data.thumbnail ? [data.thumbnail] : []),
            price: data.price,
            description: data.description || 'No description available.',
            rating: data.ratings || 4.5,
            reviews: data.numOfReviews || 120,
            stock: data.stock || 10,
            purchases: data.purchases || 0
        });

        // Extract seller info from response
        if (data.seller) {
          setSeller({
            id: data.seller._id,
            name: data.seller.name,
            avatar: data.seller.avatar?.url || data.seller.avatar,
            businessName: data.seller.businessName,
            rating: data.seller.averageRating || 0,
            verified: Boolean(data.seller.verified),
            reviewCount: data.seller.reviewCount || 0,
            joinedDate: data.seller.joinedDate
          });
        }
      } catch (error) {
        console.error('Failed to fetch product details', error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load product details' });
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProductDetails();
  }, [productId]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    const newReview = {
      id: String(Date.now()),
      user: 'You',
      rating,
      comment: reviewText || 'Great product',
      date: 'Just now'
    };
    setReviews([newReview, ...reviews]);
    setModalVisible(false);
    setRating(0);
    setReviewText('');
    Toast.show({ type: 'success', text1: 'Review Submitted', text2: 'Thank you for your feedback!' });
  };

  const handleAddToCart = async () => {
    if (!selectedSize && sizes.length > 0) {
      Toast.show({ type: 'error', text1: 'Size Required', text2: 'Please select a size' });
      return;
    }

    setAddingToCart(true);
    try {
      addToCart({ 
        ...product, 
        quantity,
        selectedSize,
        selectedColor,
        seller: seller
      });
      Toast.show({ type: 'success', text1: '✅ Added to Cart', text2: `${product.name} added successfully` });
      
      setTimeout(() => {
        setAddingToCart(false);
        router.push('/_hidden/cart');
      }, 800);
    } catch (error) {
      setAddingToCart(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add to cart' });
    }
  };

  const handleBuyNow = async () => {
    if (!selectedSize && sizes.length > 0) {
      Toast.show({ type: 'error', text1: 'Size Required', text2: 'Please select a size' });
      return;
    }

    addToCart({ 
      ...product, 
      quantity,
      selectedSize,
      selectedColor,
      seller: seller
    });
    
    router.push('/checkout');
  };

  const handleContactSeller = () => {
    if (!seller) return;
    router.push({
      pathname: '/(routes)/chat/[sellerId]',
      params: { sellerId: seller.id, sellerName: seller.name }
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isWishlisted = wishlistIds.includes(product._id);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Image Carousel */}
        <AnimatedView entering={ZoomIn} style={styles.imageContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(product.images && product.images.length > 0 ? product.images : [product.image]).map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.productImage} resizeMode="cover" />
            ))}
          </ScrollView>
          
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialCommunityIcons name="share-variant" size={22} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => toggleWishlist(product._id)} 
                style={[styles.iconButton, { marginLeft: 8 }]}
              >
                <Ionicons 
                  name={isWishlisted ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isWishlisted ? "#EF4444" : "#111827"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stock badge */}
          {product.stock < 5 && product.stock > 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Only {product.stock} left!</Text>
            </View>
          )}
        </AnimatedView>

        <AnimatedView entering={FadeInDown.delay(200)} style={styles.detailsContainer}>
          {/* Title and Rating */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {product.rating ? product.rating.toFixed(1) : '4.5'} ({product.reviews || 0} reviews)
                </Text>
                <Text style={styles.soldText}>• {product.purchases || 0} sold</Text>
              </View>
            </View>
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>
            {product.oldPrice && (
              <Text style={styles.oldPrice}>₦{product.oldPrice?.toLocaleString()}</Text>
            )}
          </View>

          {/* Seller Information Card */}
          {seller && (
            <AnimatedView entering={FadeInRight.delay(300)} style={styles.sellerCard}>
              <LinearGradient colors={['#fff5f0', '#fff']} style={styles.sellerGradient}>
                <View style={styles.sellerHeader}>
                  <Image source={{ uri: seller.avatar || 'https://i.pravatar.cc/150?u=' + seller.id }} style={styles.sellerAvatar} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.sellerNameRow}>
                      <Text style={styles.sellerName}>{seller.businessName || seller.name}</Text>
                      {seller.verified && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                    </View>
                    <View style={styles.sellerStats}>
                      <Text style={styles.sellerRating}>⭐ {Number(seller.rating || 0).toFixed(1)}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.sellerReviews}>{seller.reviewCount || 0} reviews</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.contactSellerButton}
                  onPress={handleContactSeller}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#FF8C00" />
                  <Text style={styles.contactSellerText}>Contact Seller</Text>
                </TouchableOpacity>
              </LinearGradient>
            </AnimatedView>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this item</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Sizes */}
          {sizes && sizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Size</Text>
              <View style={styles.optionsRow}>
                {sizes.map((size: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.sizeOption, selectedSize === size && styles.selectedOption]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.optionText, selectedSize === size && styles.selectedOptionText]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Colors */}
          {colors && colors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Color</Text>
              <View style={styles.optionsRow}>
                {colors.map((color: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColorOption]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Shipping Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <View style={styles.shippingInfo}>
              <View style={styles.shippingItem}>
                <Ionicons name="car-outline" size={20} color="#FF8C00" />
                <Text style={styles.shippingText}>3-5 business days</Text>
              </View>
              <View style={styles.shippingItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                <Text style={styles.shippingText}>Buyer Protection</Text>
              </View>
            </View>
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>
            </View>
            {reviews.length === 0 ? (
              <Text style={styles.noReviewsText}>Be the first to review this product!</Text>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewUser}>{review.user}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name="star" size={12} color={i < review.rating ? "#FFD700" : "#E5E7EB"} />
                    ))}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        </AnimatedView>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityControl}>
          <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyButton}>
            <Feather name="minus" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyButton}>
            <Feather name="plus" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buyNowButton}
            onPress={handleBuyNow}
            disabled={addingToCart}
          >
            <Text style={styles.buyNowText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Review Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.ratingInput}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? "star" : "star-outline"} size={40} color="#FFD700" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput 
              style={styles.reviewInput} 
              placeholder="Share your thoughts about this product..."
              placeholderTextColor="#9CA3AF"
              multiline 
              value={reviewText} 
              onChangeText={setReviewText} 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview}>
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FF8C00', borderRadius: 8 },
  backButtonText: { color: '#fff', fontWeight: '600' },
  imageContainer: { height: 400, width: '100%', position: 'relative' },
  productImage: { width: width, height: 400 },
  headerActions: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  rightActions: { flexDirection: 'row' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  stockBadge: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stockText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  detailsContainer: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, backgroundColor: '#fff', paddingTop: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  productName: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontWeight: '600', color: '#374151', fontSize: 13 },
  soldText: { color: '#6B7280', fontSize: 12 },
  priceSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  price: { fontSize: 32, fontWeight: 'bold', color: '#FF8C00' },
  oldPrice: { fontSize: 18, color: '#9CA3AF', textDecorationLine: 'line-through' },
  sellerCard: { backgroundColor: '#fff5f0', borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#FFE4D6' },
  sellerGradient: { padding: 16 },
  sellerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  sellerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerName: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  sellerStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sellerRating: { fontSize: 13, color: '#374151', fontWeight: '600' },
  separator: { marginHorizontal: 6, color: '#D1D5DB' },
  sellerReviews: { fontSize: 13, color: '#6B7280' },
  contactSellerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, gap: 8, borderWidth: 1.5, borderColor: '#FFE4D6' },
  contactSellerText: { fontSize: 13, fontWeight: '600', color: '#FF8C00' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  writeReviewText: { color: '#FF8C00', fontWeight: '600', fontSize: 13 },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sizeOption: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  selectedOption: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  selectedOptionText: { color: '#fff' },
  colorOption: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#E5E7EB' },
  selectedColorOption: { borderWidth: 3, borderColor: '#FF8C00' },
  shippingInfo: { backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12, gap: 8 },
  shippingItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shippingText: { fontSize: 14, color: '#0369A1', fontWeight: '500' },
  noReviewsText: { color: '#6B7280', fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  reviewCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewUser: { fontWeight: 'bold', color: '#111827' },
  reviewDate: { fontSize: 12, color: '#6B7280' },
  reviewComment: { color: '#4B5563', fontSize: 14 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8 },
  qtyButton: { padding: 8 },
  qtyText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 12, color: '#111827' },
  addToCartButton: { backgroundColor: '#FF8C00', borderRadius: 30, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addToCartText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  buyNowButton: { backgroundColor: '#fff', borderRadius: 30, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: '#FF8C00' },
  buyNowText: { color: '#FF8C00', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  ratingInput: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  reviewInput: { width: '100%', height: 120, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, textAlignVertical: 'top', marginBottom: 20, fontSize: 15, color: '#111827' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelButtonText: { fontWeight: '600', fontSize: 15, color: '#6B7280' },
  submitButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#FF8C00', alignItems: 'center' },
  submitButtonText: { fontWeight: '600', fontSize: 15, color: '#fff' },
});
