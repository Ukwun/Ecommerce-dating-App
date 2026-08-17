import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import * as Haptics from 'expo-haptics';

const AnimatedView = Animated.createAnimatedComponent(View);
const { width } = Dimensions.get('window');

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/marketplace/api/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load order details',
      });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    try {
      setSubmittingRating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const sellerId = order.fulfillments?.[0]?.seller;
      if (!sellerId || order.fulfillments?.length !== 1) throw new Error('Rate each seller from its fulfillment details.');
      await axiosInstance.post('/marketplace/api/sellers/rate', {
        sellerId,
        orderId,
        rating,
        comment: '',
      });

      Toast.show({
        type: 'success',
        text1: 'Rating Submitted',
        text2: 'Thank you for your feedback!',
      });

      setRating(0);
      setTimeout(() => fetchOrder(), 500);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.error || 'Failed to submit rating',
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
        {/* Header */}
        <AnimatedView entering={FadeInDown} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </AnimatedView>

        {/* Order Info */}
        <AnimatedView entering={FadeInDown.delay(100)} style={styles.card}>
          <View style={styles.orderHeaderRow}>
            <View>
              <Text style={styles.orderId}>Order #{order.orderNumber || order._id?.slice(-8).toUpperCase()}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              {order.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </AnimatedView>

        {/* Status Timeline */}
        <AnimatedView entering={FadeInDown.delay(200)} style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.timelineContainer}>
            {['pending', 'processing', 'shipped', 'delivered'].map((status, idx) => {
              const isCompleted = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status || 'pending') >= idx;
              const icons: any = {
                pending: 'clock-outline',
                processing: 'wrench',
                shipped: 'truck-fast',
                delivered: 'check-circle',
              };
              return (
                <View key={idx}>
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineCircle, isCompleted && styles.timelineCircleActive]}>
                      <MaterialCommunityIcons
                        name={icons[status]}
                        size={14}
                        color={isCompleted ? '#fff' : '#999'}
                      />
                    </View>
                    <Text style={[styles.timelineLabel, isCompleted && styles.timelineLabelActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                  {idx < 3 && <View style={[styles.timelineLine, isCompleted && styles.timelineLineActive]} />}
                </View>
              );
            })}
          </View>
        </AnimatedView>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <AnimatedView entering={FadeInDown.delay(300)} style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.items.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                )}
                <View style={styles.itemContent}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>₦{(item.price || 0).toLocaleString()}</Text>
                </View>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemTotal}>₦{((item.price || 0) * item.quantity).toLocaleString()}</Text>
              </View>
            ))}
          </AnimatedView>
        )}

        {/* Price Summary */}
        <AnimatedView entering={FadeInDown.delay(400)} style={styles.card}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          {order.subtotal !== undefined && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text>₦{(order.subtotal || 0).toLocaleString()}</Text>
            </View>
          )}
          {order.shippingFee !== undefined && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Shipping</Text>
              <Text>₦{(order.shippingFee || 0).toLocaleString()}</Text>
            </View>
          )}
          {order.tax !== undefined && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text>₦{(order.tax || 0).toLocaleString()}</Text>
            </View>
          )}
          <LinearGradient colors={['#E0F2FE', '#F0F9FF']} style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>₦{(order.total || 0).toLocaleString()}</Text>
          </LinearGradient>
        </AnimatedView>

        {/* Rating Section */}
        {order.status === 'delivered' && order.fulfillments?.length === 1 && !order.hasReview && (
          <AnimatedView entering={ZoomIn.delay(500)} style={styles.card}>
            <Text style={styles.sectionTitle}>Rate This Order</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                  style={styles.starButton}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubmitRating}
              disabled={submittingRating || rating === 0}
              style={[styles.submitButton, (submittingRating || rating === 0) && styles.submitButtonDisabled]}
              activeOpacity={0.8}
            >
              {submittingRating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Rating</Text>
                </>
              )}
            </TouchableOpacity>
          </AnimatedView>
        )}

        {/* Seller Info */}
        {order.seller && (
          <AnimatedView entering={FadeInDown.delay(300)} style={styles.card}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.sellerBox}>
              {order.seller.avatar && (
                <Image source={{ uri: order.seller.avatar }} style={styles.sellerAvatar} />
              )}
              <View style={styles.sellerContent}>
                <Text style={styles.sellerName}>{order.seller.name}</Text>
                {order.seller.rating && (
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={12} color="#FFA500" />
                    <Text style={styles.ratingText}>{order.seller.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
          </AnimatedView>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusColor(status: string): string {
  const colors: any = {
    pending: '#FCD34D',
    processing: '#60A5FA',
    shipped: '#34D399',
    delivered: '#10B981',
    cancelled: '#EF4444',
  };
  return colors[status] || '#D1D5DB';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  card: { margin: 12, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 16, fontWeight: '700', color: '#000' },
  orderDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, color: '#fff', fontWeight: '600', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 12 },
  timelineContainer: { gap: 0 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timelineCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  timelineCircleActive: { backgroundColor: '#2563EB' },
  timelineLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  timelineLabelActive: { color: '#000', fontWeight: '600' },
  timelineLine: { width: 2, height: 12, backgroundColor: '#E5E7EB', marginLeft: 13, marginBottom: 0 },
  timelineLineActive: { backgroundColor: '#2563EB' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  itemImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#E5E7EB' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 12, fontWeight: '600', color: '#000' },
  itemPrice: { fontSize: 11, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  itemQty: { fontSize: 12, color: '#6B7280', marginHorizontal: 8 },
  itemTotal: { fontSize: 12, fontWeight: '700', color: '#000' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  priceLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginTop: 12 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#000' },
  totalPrice: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginVertical: 16 },
  starButton: { padding: 4 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, gap: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sellerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22 },
  sellerContent: { flex: 1, marginLeft: 12 },
  sellerName: { fontSize: 13, fontWeight: '700', color: '#000' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#000' },
  errorText: { fontSize: 14, color: '#EF4444', marginVertical: 12 },
  backButton: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2563EB', borderRadius: 8 },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  spacer: { height: 32 },
});
