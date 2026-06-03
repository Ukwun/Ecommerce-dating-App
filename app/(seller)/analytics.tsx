import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_URI ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://marketplace-backend.railway.app';

export default function SellerAnalyticsScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month');

  // Fetch analytics
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['seller-analytics', timeRange],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${API_BASE_URL}/seller/api/analytics?range=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {['week', 'month', 'quarter', 'year'].map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              timeRange === range && { backgroundColor: '#3B82F6' },
            ]}
            onPress={() => setTimeRange(range)}
          >
            <ThemedText
              style={[
                styles.rangeText,
                timeRange === range && { color: '#fff' },
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Overview */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Revenue Overview</ThemedText>

        <MetricDisplay
          label="Total Revenue"
          value={`₦${(analytics?.totalRevenue || 0).toLocaleString()}`}
          trend={analytics?.revenueTrend}
          icon="📈"
        />
        <MetricDisplay
          label="Average Order Value"
          value={`₦${(analytics?.avgOrderValue || 0).toLocaleString()}`}
          trend={analytics?.avgOrderTrend || '↑ 5%'}
          icon="💳"
        />
        <MetricDisplay
          label="Commission Paid"
          value={`₦${(analytics?.commissionPaid || 0).toLocaleString()}`}
          trend={analytics?.commissionTrend || '↓ 2%'}
          icon="💸"
        />
      </View>

      {/* Performance Metrics */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Performance Metrics</ThemedText>

        <MetricBar
          label="Conversion Rate"
          value={analytics?.conversionRate || 0}
          max={100}
          unit="%"
          isNegative={false}
        />
        <MetricBar
          label="Return Rate"
          value={analytics?.returnRate || 0}
          max={100}
          unit="%"
          isNegative
        />
        <MetricBar
          label="Customer Satisfaction"
          value={analytics?.satisfaction || 0}
          max={100}
          unit="%"
          isNegative={false}
        />
        <MetricBar
          label="On-Time Delivery"
          value={analytics?.onTimeDelivery || 0}
          max={100}
          unit="%"
          isNegative={false}
        />
      </View>

      {/* Top Products */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Top Products</ThemedText>

        {analytics?.topProducts?.slice(0, 5).map((product: any, index: any) => (
          <ProductRow key={index} rank={index + 1} product={product} />
        )) || <ThemedText style={styles.emptyText}>No products yet</ThemedText>}
      </View>

      {/* Category Performance */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Category Performance</ThemedText>

        {analytics?.categories?.map((category: any, index: any) => (
          <CategoryRow key={index} category={category} />
        )) || <ThemedText style={styles.emptyText}>No categories</ThemedText>}
      </View>

      {/* Traffic Sources */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Traffic Sources</ThemedText>

        <TrafficRow icon="🔍" label="Search" percentage={analytics?.searchPercentage} />
        <TrafficRow icon="🏠" label="Homepage" percentage={analytics?.homepagePercentage} />
        <TrafficRow icon="🔗" label="Direct Link" percentage={analytics?.directPercentage} />
        <TrafficRow icon="📱" label="Social Media" percentage={analytics?.socialPercentage} />
      </View>
    </ScrollView>
  );
}

function MetricDisplay({ label, value, trend, icon }: any) {
  const trendColor = trend === 'up' ? '#10B981' : '#EF4444';
  const trendIcon = trend === 'up' ? '📈' : '📉';

  return (
    <View style={styles.metricDisplay}>
      <View style={styles.metricLeft}>
        <ThemedText style={styles.metricIcon}>{icon}</ThemedText>
        <View>
          <ThemedText style={styles.metricLabel}>{label}</ThemedText>
          <ThemedText style={styles.metricValue}>{value}</ThemedText>
        </View>
      </View>
      {trend && (
        <ThemedText style={[styles.trendIcon, { color: trendColor }]}>
          {trendIcon}
        </ThemedText>
      )}
    </View>
  );
}

function MetricBar({ label, value, max, unit, isNegative }: any) {
  const percentage = (value / max) * 100;
  const color = isNegative 
    ? percentage > 20 ? '#EF4444' : '#10B981'
    : percentage > 70 ? '#10B981' : percentage > 40 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.metricBar}>
      <View style={styles.barHeader}>
        <ThemedText style={styles.barLabel}>{label}</ThemedText>
        <ThemedText style={[styles.barValue, { color }]}>
          {value.toFixed(1)}{unit}
        </ThemedText>
      </View>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function ProductRow({ rank, product }: any) {
  return (
    <View style={styles.productRow}>
      <View style={styles.productRank}>
        <ThemedText style={styles.rankText}>#{rank}</ThemedText>
      </View>
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText style={styles.productStats}>
          {product.sales} sales • ₦{product.revenue.toLocaleString()}
        </ThemedText>
      </View>
      <ThemedText style={styles.productRevenue}>
        ₦{product.revenue.toLocaleString()}
      </ThemedText>
    </View>
  );
}

function CategoryRow({ category }: any) {
  return (
    <View style={styles.categoryRow}>
      <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
      <ThemedText style={styles.categoryStats}>
        {category.products} products • {category.orders} orders
      </ThemedText>
      <ThemedText style={styles.categoryRevenue}>
        ₦{category.revenue.toLocaleString()}
      </ThemedText>
    </View>
  );
}

function TrafficRow({ icon, label, percentage }: any) {
  return (
    <View style={styles.trafficRow}>
      <View style={styles.trafficLabel}>
        <ThemedText style={styles.trafficIcon}>{icon}</ThemedText>
        <ThemedText style={styles.trafficName}>{label}</ThemedText>
      </View>
      <View style={styles.trafficBar}>
        <View
          style={[
            styles.trafficBarFill,
            { width: `${percentage || 0}%` },
          ]}
        />
      </View>
      <ThemedText style={styles.trafficPercent}>{percentage || 0}%</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginVertical: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIcon: {
    fontSize: 24,
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  trendIcon: {
    fontSize: 18,
  },
  metricBar: {
    marginVertical: 10,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
  },
  productStats: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryStats: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 4,
  },
  categoryRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  trafficLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 80,
  },
  trafficIcon: {
    fontSize: 14,
  },
  trafficName: {
    fontSize: 12,
    fontWeight: '500',
  },
  trafficBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trafficBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  trafficPercent: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
    paddingVertical: 10,
  },
});
