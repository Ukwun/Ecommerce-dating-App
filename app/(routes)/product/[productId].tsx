import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosinstance';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { productId } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Review State
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Mock data for features not always in API
  const sizes = ['S', 'M', 'L', 'XL'];
  const colors = ['#000000', '#FFFFFF', '#FF0000', '#0000FF'];
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await axiosInstance.get(`/marketplace/api/products/${productId}`);
        const data = response.data.data || response.data;
        setProduct({
            ...data,
            name: data.title || data.name,
            image: data.thumbnail || (data.images && data.images[0]) || 'https://via.placeholder.com/300',
            images: data.images || [data.thumbnail],
            price: data.price,
            description: data.description || 'No description available.',
            rating: 4.5, // Mock if missing
            reviews: 120 // Mock if missing
        });
      } catch (error) {
        console.error('Failed to fetch product details', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProductDetails();
  }, [productId]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axiosInstance.get(`/marketplace/api/reviews/${productId}`);
        if (response.data.success) {
          const formattedReviews = response.data.data.map((r: any) => ({
            id: r._id,
            user: r.user?.name || 'Anonymous',
            rating: r.rating,
            comment: r.comment,
            date: new Date(r.createdAt).toLocaleDateString()
          }));
          setReviews(formattedReviews);
        }
      } catch (error) {
        console.error('Failed to fetch reviews', error);
      }
    };

    if (productId) fetchReviews();
  }, [productId]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    try {
      const response = await axiosInstance.post('/marketplace/api/reviews', {
        productId,
        rating,
        comment: reviewText
      });

      if (response.data.success) {
        const r = response.data.data;
        const newReview = {
          id: r._id,
          user: r.user?.name || 'You',
          rating: r.rating,
          comment: r.comment,
          date: 'Just now'
        };
        setReviews([newReview, ...reviews]);
        setModalVisible(false);
        setRating(0);
        setReviewText('');
        Alert.alert('Success', 'Review submitted successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    }
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
        <Text>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{color: 'blue', marginTop: 10}}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const isWishlisted = wishlistIds.includes(product._id);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
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
            <TouchableOpacity onPress={() => toggleWishlist(product._id)} style={styles.iconButton}>
              <Ionicons name={isWishlisted ? "heart" : "heart-outline"} size={24} color={isWishlisted ? "#EF4444" : "#111827"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{product.rating} ({product.reviews} reviews)</Text>
            </View>
          </View>

          <Text style={styles.price}>₦{product.price.toLocaleString()}</Text>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Sizes */}
          <Text style={styles.sectionTitle}>Select Size</Text>
          <View style={styles.optionsRow}>
            {sizes.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeOption, selectedSize === size && styles.selectedOption]}
                onPress={() => setSelectedSize(size)}
              >
                <Text style={[styles.optionText, selectedSize === size && styles.selectedOptionText]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Colors */}
          <Text style={styles.sectionTitle}>Select Color</Text>
          <View style={styles.optionsRow}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColorOption]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          {/* Reviews Preview */}
          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
            {reviews.map((review) => (
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
            ))}
          </View>
        </View>
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
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={() => {
            addToCart({ ...product, quantity });
            router.push('/_hidden/cart');
          }}
        >
          <Text style={styles.addToCartText}>Add to Cart - ₦{(product.price * quantity).toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      {/* Write Review Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <View style={styles.ratingInput}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.reviewInput} placeholder="Share your thoughts..." multiline value={reviewText} onChangeText={setReviewText} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview}><Text style={[styles.buttonText, { color: '#fff' }]}>Submit</Text></TouchableOpacity>
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
  imageContainer: { height: 400, width: '100%', position: 'relative' },
  productImage: { width: width, height: 400 },
  headerActions: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  detailsContainer: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, backgroundColor: '#fff' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  productName: { fontSize: 24, fontWeight: 'bold', color: '#111827', flex: 1, marginRight: 10 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { marginLeft: 4, fontWeight: '600', color: '#92400E', fontSize: 12 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#FF8C00', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12, marginTop: 12 },
  description: { fontSize: 16, color: '#4B5563', lineHeight: 24 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sizeOption: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  selectedOption: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  selectedOptionText: { color: '#fff' },
  colorOption: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  selectedColorOption: { borderWidth: 3, borderColor: '#FF8C00' },
  reviewsSection: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  writeReviewText: { color: '#FF8C00', fontWeight: '600' },
  reviewCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewUser: { fontWeight: 'bold', color: '#111827' },
  reviewDate: { fontSize: 12, color: '#6B7280' },
  reviewComment: { color: '#4B5563' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingBottom: 30 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8, marginRight: 16 },
  qtyButton: { padding: 8 },
  qtyText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 12 },
  addToCartButton: { flex: 1, backgroundColor: '#FF8C00', borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
  addToCartText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  ratingInput: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  reviewInput: { width: '100%', height: 100, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  submitButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#FF8C00', alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 },
});