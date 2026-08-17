import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function SellerDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch seller dashboard
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/seller/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
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

  if (error) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
          <ThemedText style={styles.errorTitle}>Failed to Load Dashboard</ThemedText>
          <ThemedText style={styles.errorMessage}>
            {(error as any)?.response?.data?.message || 'Unable to fetch dashboard data'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.errorButtonText}>🔄 Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Welcome Section */}
      <View style={[styles.welcomeCard, { backgroundColor: theme.colors.primary }]}>
        <ThemedText style={styles.welcomeTitle}>
          Welcome, {dashboard?.sellerName || 'Seller'}! 👋
        </ThemedText>
        <ThemedText style={styles.welcomeSubtitle}>
          {dashboard?.businessName}
        </ThemedText>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          label="Total Orders"
          value={dashboard?.totalOrders || 0}
          icon="📦"
          color="#3B82F6"
          onPress={() => router.push('/(seller)/orders')}
        />
        <MetricCard
          label="Month Revenue"
          value={`₦${(dashboard?.monthRevenue || 0).toLocaleString()}`}
          icon="💰"
          color="#10B981"
          onPress={() => router.push('/(seller)/analytics')}
        />
        <MetricCard
          label="Rating"
          value={`${(dashboard?.avgRating || 0).toFixed(1)}/5`}
          icon="⭐"
          color="#F59E0B"
          onPress={() => {}}
        />
        <MetricCard
          label="Products"
          value={dashboard?.totalProducts || 0}
          icon="🏷️"
          color="#8B5CF6"
          onPress={() => router.push('/(seller)/analytics' as any)}
        />
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>

        <ActionButton
          label="📝 Add New Product"
          onPress={() => router.push('/(seller)/analytics' as any)}
        />
        <ActionButton
          label="📊 View Analytics"
          onPress={() => router.push('/(seller)/analytics')}
        />
        <ActionButton
          label="👤 Update Profile"
          onPress={() => router.push('/(seller)/profile')}
        />
        <ActionButton
          label="💳 Manage Bank Details"
          onPress={() => router.push('/(seller)/profile')}
        />
      </View>

      {/* Recent Orders */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Recent Orders</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(seller)/orders')}>
            <ThemedText style={styles.viewAll}>View All →</ThemedText>
          </TouchableOpacity>
        </View>

        {dashboard?.recentOrders?.length === 0 ? (
          <ThemedText style={styles.emptyText}>No orders yet</ThemedText>
        ) : (
          dashboard?.recentOrders?.slice(0, 3).map((order: any, index: any) => (
            <RecentOrderItem key={index} order={order} />
          ))
        )}
      </View>

      {/* Performance Overview */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Performance Overview</ThemedText>

        <PerformanceRow
          label="Conversion Rate"
          value={`${(dashboard?.conversionRate || 0).toFixed(1)}%`}
          trend={dashboard?.conversionTrend}
        />
        <PerformanceRow
          label="Return Rate"
          value={`${(dashboard?.returnRate || 0).toFixed(1)}%`}
          trend={dashboard?.returnTrend}
        />
        <PerformanceRow
          label="Customer Satisfaction"
          value={`${(dashboard?.satisfaction || 0).toFixed(0)}%`}
          trend={dashboard?.satisfactionTrend}
        />
      </View>

      {/* Earnings Summary */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Earnings This Month</ThemedText>

        <EarningsSummary
          label="Gross Revenue"
          value={`₦${(dashboard?.grossRevenue || 0).toLocaleString()}`}
          bold={false}
          color="#3B82F6"
        />
        <EarningsSummary
          label="Commission (Paid)"
          value={`-₦${(dashboard?.commission || 0).toLocaleString()}`}
          color="#EF4444"
          bold={false}
        />
        <EarningsSummary
          label="Net Earnings"
          value={`₦${(dashboard?.netEarnings || 0).toLocaleString()}`}
          bold
          color="#10B981"
        />
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, color, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.metricCard, { backgroundColor: color + '15' }]}>
      <ThemedText style={styles.metricIcon}>{icon}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function ActionButton({ label, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.actionButton}>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
      <ThemedText style={styles.actionArrow}>→</ThemedText>
    </TouchableOpacity>
  );
}

function RecentOrderItem({ order }: any) {
  const statusColors = {
    pending: '#FEF3C7',
    confirmed: '#DBEAFE',
    shipped: '#D1FAE5',
    delivered: '#C7D2FE',
  };

  const status = (order as any)?.status as string;
  const colors = statusColors as any;

  return (
    <View style={[styles.orderItem, { borderLeftColor: colors[status], borderLeftWidth: 3 }]}>
      <View style={styles.orderHeader}>
        <ThemedText style={styles.orderId}>Order #{order.orderId}</ThemedText>
        <ThemedText style={styles.orderStatus}>{order.status}</ThemedText>
      </View>
      <ThemedText style={styles.orderAmount}>{order.itemCount} items • ₦{order.amount}</ThemedText>
      <ThemedText style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</ThemedText>
    </View>
  );
}

function PerformanceRow({ label, value, trend }: any) {
  const trendColor = trend === 'up' ? '#10B981' : '#EF4444';
  const trendIcon = trend === 'up' ? '📈' : '📉';

  return (
    <View style={styles.performanceRow}>
      <ThemedText style={styles.performanceLabel}>{label}</ThemedText>
      <View style={styles.performanceValue}>
        <ThemedText style={styles.performanceNumber}>{value}</ThemedText>
        {trend && <ThemedText style={[styles.trendIcon, { color: trendColor }]}>{trendIcon}</ThemedText>}
      </View>
    </View>
  );
}

function EarningsSummary({ label, value, color, bold }: any) {
  return (
    <View style={styles.earningsRow}>
      <ThemedText style={styles.earningsLabel}>{label}</ThemedText>
      <ThemedText style={[styles.earningsValue, bold && styles.earningsBold, color && { color }]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 6,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  welcomeCard: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginVertical: 10,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 8,
    gap: 8,
  },
  metricCard: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  section: {
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
    paddingVertical: 10,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 14,
    opacity: 0.5,
  },
  orderItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderStatus: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
  },
  orderAmount: {
    fontSize: 12,
    opacity: 0.7,
  },
  orderDate: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 4,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  performanceLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  performanceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  performanceNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendIcon: {
    fontSize: 14,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  earningsLabel: {
    fontSize: 13,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  earningsBold: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
