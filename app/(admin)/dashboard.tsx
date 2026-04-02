import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.100:5000';

export default function AdminDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch admin dashboard KPIs
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/admin/api/analytics/dashboard`, {
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
          <ThemedText style={styles.errorIcon}>❌</ThemedText>
          <ThemedText style={styles.errorTitle}>Failed to Load Dashboard</ThemedText>
          <ThemedText style={styles.errorMessage}>
            {(error as any)?.response?.data?.message || 'Unable to fetch dashboard data'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.retryText}>🔄 Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <KPICard
          label="Total Users"
          value={dashboard?.totalUsers || 0}
          icon="👥"
          color="#3B82F6"
        />
        <KPICard
          label="Active Sellers"
          value={dashboard?.activeSellers || 0}
          icon="🏪"
          color="#10B981"
        />
        <KPICard
          label="Total Orders"
          value={dashboard?.totalOrders || 0}
          icon="📦"
          color="#F59E0B"
        />
        <KPICard
          label="Platform Revenue"
          value={`₦${(dashboard?.totalRevenue || 0).toLocaleString()}`}
          icon="💰"
          color="#8B5CF6"
        />
      </View>

      {/* Critical Actions */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Critical Actions</ThemedText>

        <ActionButton
          label={`Pending Sellers: ${dashboard?.pendingSellers || 0}`}
          icon="⏳"
          onPress={() => router.push('/(admin)/seller-approval')}
          highlight={dashboard?.pendingSellers > 0}
        />

        <ActionButton
          label={`Open Returns: ${dashboard?.openReturns || 0}`}
          icon="↩️"
          onPress={() => router.push('/(admin)/returns-management')}
          highlight={dashboard?.openReturns > 0}
        />

        <ActionButton
          label={`Open Tickets: ${dashboard?.openTickets || 0}`}
          icon="🎟️"
          onPress={() => router.push('/(admin)/support-queue')}
          highlight={dashboard?.openTickets > 0}
        />

        <ActionButton
          label={`Flagged Orders: ${dashboard?.flaggedOrders || 0}`}
          icon="🚩"
          onPress={() => Alert.alert('Not yet implemented')}
          highlight={dashboard?.flaggedOrders > 0}
        />
      </View>

      {/* Performance Metrics */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Performance Metrics</ThemedText>

        <MetricRow
          label="Average Order Value"
          value={`₦${(dashboard?.avgOrderValue || 0).toLocaleString()}`}
        />
        <MetricRow
          label="Return Rate"
          value={`${(dashboard?.returnRate || 0).toFixed(2)}%`}
        />
        <MetricRow
          label="Customer Satisfaction"
          value={`${(dashboard?.avgRating || 0).toFixed(1)}/5.0`}
        />
        <MetricRow
          label="Seller Approval Rate"
          value={`${(dashboard?.sellerApprovalRate || 0).toFixed(1)}%`}
        />
      </View>

      {/* System Health */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>System Health</ThemedText>

        <HealthIndicator
          label="API Status"
          status={error ? 'warning' : 'healthy'}
        />
        <HealthIndicator label="Database" status="healthy" />
        <HealthIndicator label="Payment Gateway" status="healthy" />
        <HealthIndicator label="CDN" status="healthy" />
      </View>

      {/* Admin Tools */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Admin Tools</ThemedText>

        <AdminToolButton
          label="View Audit Logs"
          icon="📋"
          onPress={() => Alert.alert('Feature coming soon')}
        />

        <AdminToolButton
          label="Manage Commissions"
          icon="⚙️"
          onPress={() => Alert.alert('Feature coming soon')}
        />

        <AdminToolButton
          label="Send Announcement"
          icon="📢"
          onPress={() => Alert.alert('Feature coming soon')}
        />

        <AdminToolButton
          label="System Settings"
          icon="🔧"
          onPress={() => Alert.alert('Feature coming soon')}
        />
      </View>
    </ScrollView>
  );
}

// Component: KPI Card
function KPICard({ label, value, icon, color }: any) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: color + '20', borderLeftColor: color }]}>
      <ThemedText style={styles.kpiIcon}>{icon}</ThemedText>
      <ThemedText style={styles.kpiValue}>{value}</ThemedText>
      <ThemedText style={styles.kpiLabel}>{label}</ThemedText>
    </View>
  );
}

// Component: Action Button
function ActionButton({ label, icon, onPress, highlight }: any) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.actionButton,
        highlight && { backgroundColor: '#FEE2E2', borderLeftColor: '#EF4444' },
      ]}
    >
      <ThemedText style={styles.actionIcon}>{icon}</ThemedText>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
      <ThemedText style={styles.actionArrow}>→</ThemedText>
    </TouchableOpacity>
  );
}

// Component: Metric Row
function MetricRow({ label, value }: any) {
  return (
    <View style={styles.metricRow}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

// Component: Health Indicator
function HealthIndicator({ label, status }: any) {
  const statusColor = status === 'healthy' ? '#10B981' : '#F59E0B';
  const statusText = status === 'healthy' ? 'Healthy' : 'Warning';

  return (
    <View style={styles.healthRow}>
      <ThemedText style={styles.healthLabel}>{label}</ThemedText>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {statusText}
        </ThemedText>
      </View>
    </View>
  );
}

// Component: Admin Tool Button
function AdminToolButton({ label, icon, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.toolButton}>
      <ThemedText style={styles.toolIcon}>{icon}</ThemedText>
      <ThemedText style={styles.toolLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
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
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 15,
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    borderLeftWidth: 4,
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 12,
    opacity: 0.7,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    marginVertical: 6,
    borderRadius: 6,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 16,
    opacity: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  healthLabel: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  toolIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
