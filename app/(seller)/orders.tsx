import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_URI ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://ecommerce-dating-app.onrender.com';

export default function SellerOrdersScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['seller-orders', statusFilter],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await axios.get(`${API_BASE_URL}/seller/api/orders${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.orders || [];
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ThemedView>
    );
  }

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o: any) => o.status === 'pending').length || 0,
    confirmed: orders?.filter((o: any) => o.status === 'confirmed').length || 0,
    shipped: orders?.filter((o: any) => o.status === 'shipped').length || 0,
    delivered: orders?.filter((o: any) => o.status === 'delivered').length || 0,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <StatsBadge label="Total" count={stats.total} color="#3B82F6" />
        <StatsBadge label="Pending" count={stats.pending} color="#F59E0B" />
        <StatsBadge label="Confirmed" count={stats.confirmed} color="#3B82F6" />
        <StatsBadge label="Shipped" count={stats.shipped} color="#10B981" />
        <StatsBadge label="Delivered" count={stats.delivered} color="#8B5CF6" />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && { backgroundColor: '#3B82F6' },
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <ThemedText
              style={[
                styles.filterText,
                statusFilter === status && { color: '#fff' },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      {orders?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No orders</ThemedText>
        </View>
      ) : (
        orders?.map((order: any) => (
          <OrderCard key={order._id} order={order} />
        ))
      )}
    </ScrollView>
  );
}

function StatsBadge({ label, count, color }: any) {
  return (
    <View style={[styles.badge, { borderLeftColor: color }]}>
      <ThemedText style={styles.badgeLabel}>{label}</ThemedText>
      <ThemedText style={[styles.badgeCount, { color }]}>{count}</ThemedText>
    </View>
  );
}

function OrderCard({ order }: any) {
  const theme = useTheme();
  const statusIcons = {
    pending: '⏳',
    confirmed: '✅',
    shipped: '🚚',
    delivered: '📦',
  };

  const statusColors = {
    pending: '#FEF3C7',
    confirmed: '#DBEAFE',
    shipped: '#D1FAE5',
    delivered: '#C7D2FE',
  };

  const status = (order as any)?.status as string;
  const icon = statusIcons as any;
  const colors = statusColors as any;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.orderId}>Order #{order._id}</ThemedText>
          <ThemedText style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: colors[status] },
          ]}
        >
          <ThemedText style={styles.statusIcon}>
            {icon[status]} {status}
          </ThemedText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.items}>
        {(order as any).items?.map((item: any, index: number) => (
          <ItemRow key={index} item={item} />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View>
          <ThemedText style={styles.totalLabel}>Total Amount</ThemedText>
          <ThemedText style={styles.totalAmount}>
            ₦{order.totalAmount?.toLocaleString()}
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.detailsButton}>
          <ThemedText style={styles.detailsButtonText}>View Details →</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ItemRow({ item }: any) {
  return (
    <View style={styles.itemRow}>
      <View>
        <ThemedText style={styles.itemName} numberOfLines={1}>
          {item.productName}
        </ThemedText>
        <ThemedText style={styles.itemQty}>Quantity: {item.quantity}</ThemedText>
      </View>
      <ThemedText style={styles.itemPrice}>₦{item.price?.toLocaleString()}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    backgroundColor: '#F3F4F6',
  },
  badgeLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  badgeCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusIcon: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  items: {
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 11,
    opacity: 0.6,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  detailsButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
