import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '@/hooks/CartContext';
import Toast from 'react-native-toast-message';

type Order = {
  _id: string;
  date: string;
  total: number;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  itemCount: number;
};

// This would be a real product type in your app
type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
};

const fetchOrders = async (): Promise<Order[]> => {
  // Mock data. Replace with your actual API call.
  return [
    { _id: 'ORD-123XYZ', date: '2023-10-26', total: 15500, status: 'Delivered', itemCount: 2 },
    { _id: 'ORD-456ABC', date: '2023-10-24', total: 8200, status: 'Shipped', itemCount: 1 },
    { _id: 'ORD-789DEF', date: '2023-10-22', total: 25000, status: 'Processing', itemCount: 3 },
    { _id: 'ORD-101GHI', date: '2023-10-20', total: 5400, status: 'Cancelled', itemCount: 1 },
  ];
};

const fetchOrderDetails = async (orderId: string): Promise<Product[]> => {
  // In a real app, this would fetch the products associated with the orderId.
  console.log(`Fetching details for order ${orderId}`);
  // We'll return mock product data for now.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  return [
    { _id: 'prod1', name: 'Classic T-Shirt', price: 8000, image: 'https://via.placeholder.com/150' },
    { _id: 'prod2', name: 'Denim Jeans', price: 7500, image: 'https://via.placeholder.com/150' },
  ];
};

const getStatusStyle = (status: Order['status']) => {
  switch (status) {
    case 'Delivered': return { badge: styles.badgeDelivered, text: styles.badgeTextDelivered, icon: 'check-circle' as const };
    case 'Shipped': return { badge: styles.badgeShipped, text: styles.badgeTextShipped, icon: 'truck-fast' as const };
    case 'Processing': return { badge: styles.badgeProcessing, text: styles.badgeTextProcessing, icon: 'clock-time-three' as const };
    case 'Cancelled': return { badge: styles.badgeCancelled, text: styles.badgeTextCancelled, icon: 'cancel' as const };
    default: return { badge: styles.badgeCancelled, text: styles.badgeTextCancelled, icon: 'help-circle' as const };
  }
};

const OrderItem = ({ item, onReorder, isReordering }: { item: Order; onReorder: (orderId: string) => void; isReordering: boolean; }) => {
  const statusStyle = getStatusStyle(item.status);
  const canReorder = item.status === 'Delivered';
  return (
    <View style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>{item._id}</Text>
        <View style={[styles.statusBadge, statusStyle.badge]}>
          <MaterialCommunityIcons name={statusStyle.icon} color={statusStyle.text.color} size={12} />
          <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.orderInfo}>Date: {new Date(item.date).toLocaleDateString()}</Text>
        <Text style={styles.orderInfo}>Items: {item.itemCount}</Text>
        <Text style={styles.orderTotal}>Total: ₦{item.total.toLocaleString()}</Text>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.detailsButton, !canReorder && styles.disabledButton]}
          onPress={() => canReorder && onReorder(item._id)}
          disabled={!canReorder || isReordering}
        >
          <Text style={[styles.detailsButtonText, !canReorder && styles.disabledButtonText]}>{isReordering ? 'Adding...' : 'Re-order'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => router.push({ pathname: '/(routes)/track-order/[orderId]' as any, params: { orderId: item._id } })}
          // Long press to send a test notification for this order
          onLongPress={() => sendTestNotification(item._id)}
        >
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Function to simulate sending a push notification
async function sendTestNotification(orderId: string) {
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Order Status Update 🚚',
        body: `Your order ${orderId} has been shipped!`,
        data: { orderId: orderId },
      },
      trigger: { type: 'timeInterval', seconds: 2, repeats: false } as any,
    });
    Toast.show({ type: 'info', text1: 'Test Notification Sent', text2: 'You should receive a notification in 2 seconds.' });
  } catch (err) {
    // Fail gracefully in Expo Go or environments without notifications support
    console.warn('Cannot send test notification in this environment:', err);
    Toast.show({ type: 'info', text1: 'Notifications unavailable', text2: 'Push notifications are not available in this environment.' });
  }
}

export default function MyOrdersScreen() {
  const { addToCart } = useCart();
  const { data: orders, isLoading } = useQuery({ queryKey: ['myOrders'], queryFn: fetchOrders });

  const reorderMutation = useMutation({
    mutationFn: fetchOrderDetails,
    onSuccess: (products) => {
      products.forEach(product => addToCart(product));
      Toast.show({
        type: 'success',
        text1: 'Items Added to Cart',
        text2: 'The items from your past order have been added to your cart.',
      });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Re-order Failed', text2: error.message });
    },
  });

  const handleReorder = (orderId: string) => reorderMutation.mutate(orderId);

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={orders}
            renderItem={({ item }) => (
              <OrderItem
                item={item}
                onReorder={handleReorder}
                isReordering={reorderMutation.isPending && reorderMutation.variables === item._id}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  listContainer: { padding: 16 },
  orderCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  badgeDelivered: { backgroundColor: '#D1FAE5' },
  badgeTextDelivered: { color: '#065F46' },
  badgeShipped: { backgroundColor: '#DBEAFE' },
  badgeTextShipped: { color: '#1E40AF' },
  badgeProcessing: { backgroundColor: '#FEF3C7' },
  badgeTextProcessing: { color: '#92400E' },
  badgeCancelled: { backgroundColor: '#FEE2E2' },
  badgeTextCancelled: { color: '#991B1B' },
  cardBody: { padding: 16 },
  orderInfo: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 8 },
  cardFooter: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  detailsButton: { flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  detailsButtonText: { color: '#4B5563', fontWeight: '600' },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  trackButton: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#FFEFD5' },
  trackButtonText: { color: '#FF8C00', fontWeight: 'bold' },
});