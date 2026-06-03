import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { useCart } from '@/hooks/CartContext';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

type Order = {
  _id: string;
  orderNumber?: string;
  createdAt: string;
  total: number;
  status: OrderStatus;
  products: { product: any; quantity: number; price: number }[];
};

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; icon: any; label: string }> = {
  pending:    { color: '#92400E', bg: '#FEF3C7', icon: 'time-outline',         label: 'Pending' },
  confirmed:  { color: '#1E40AF', bg: '#DBEAFE', icon: 'checkmark-circle',     label: 'Confirmed' },
  processing: { color: '#5B21B6', bg: '#EDE9FE', icon: 'construct-outline',    label: 'Processing' },
  shipped:    { color: '#065F46', bg: '#D1FAE5', icon: 'airplane-outline',     label: 'Shipped' },
  delivered:  { color: '#065F46', bg: '#D1FAE5', icon: 'checkmark-done',       label: 'Delivered' },
  cancelled:  { color: '#991B1B', bg: '#FEE2E2', icon: 'close-circle-outline', label: 'Cancelled' },
  refunded:   { color: '#1E40AF', bg: '#DBEAFE', icon: 'refresh-circle',       label: 'Refunded' },
};

function OrderCard({ item, index, onReorder }: { item: Order; index: number; onReorder: (order: Order) => void }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const date = new Date(item.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  const itemCount = item.products?.reduce((s: number, p: any) => s + (p.quantity || 1), 0) || 0;

  return (
    <Animated.View entering={SlideInRight.delay(index * 70).springify()}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/(routes)/my-orders/[orderId]', params: { orderId: item._id } } as any)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>#{item.orderNumber || item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.bodyRow}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#6B7280" />
            <Text style={styles.bodyText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={styles.totalText}>₦{Number(item.total).toLocaleString()}</Text>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.push({ pathname: '/(routes)/my-orders/[orderId]', params: { orderId: item._id } } as any)}
          >
            <Ionicons name="location-outline" size={14} color="#FF8C00" />
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>

          {item.status === 'delivered' && (
            <TouchableOpacity
              style={styles.reorderBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onReorder(item); }}
            >
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.reorderBtnText}>Re-order</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MyOrdersScreen() {
  const { addToCart } = useCart();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['myOrders'],
    queryFn: async () => {
      const res = await axiosInstance.get('/marketplace/api/orders');
      return res.data.data || [];
    },
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const reorderMutation = useMutation({
    mutationFn: async (order: Order) => {
      // Fetch full product details for each item and add to cart
      const products = order.products || [];
      products.forEach((item: any) => {
        if (item.product) {
          addToCart({
            _id: item.product._id || item.product,
            name: item.product.name || 'Product',
            price: item.price,
            image: item.product.images?.[0]?.url || '',
          });
        }
      });
      return products.length;
    },
    onSuccess: (count) => {
      Toast.show({ type: 'success', text1: '🛒 Added to Cart', text2: `${count} item(s) added from your past order` });
      router.push('/_hidden/cart');
    },
    onError: () => Toast.show({ type: 'error', text1: 'Re-order failed' }),
  });

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyBox}>
            <MaterialCommunityIcons name="shopping-outline" size={72} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Your orders will appear here once you start shopping</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/(tabs)' as any)}>
              <Text style={styles.shopNowText}>Start Shopping</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <OrderCard
                item={item}
                index={index}
                onReorder={(order) => reorderMutation.mutate(order)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
  orderId: { fontSize: 15, fontWeight: '800', color: '#111827' },
  orderDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingVertical: 12 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bodyText: { fontSize: 14, color: '#6B7280' },
  totalText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardFooter: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 0 },
  trackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#FF8C00' },
  trackBtnText: { color: '#FF8C00', fontWeight: '700', fontSize: 13 },
  reorderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FF8C00' },
  reorderBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#fff', fontSize: 15 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  shopNowBtn: { backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25, marginTop: 8 },
  shopNowText: { color: '#FF8C00', fontWeight: '700', fontSize: 16 },
});
