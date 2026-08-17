import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_URI ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://ecommerce-dating-app.onrender.com';

export default function ReturnsManagementScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('requested');

  // Fetch returns
  const { data: returns, isLoading, refetch } = useQuery({
    queryKey: ['admin-returns', statusFilter],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${API_BASE_URL}/admin/api/returns?status=${statusFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.returns || [];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (returnId) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/admin/api/returns/${returnId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      refetch();
      Alert.alert('Success', 'Return request approved');
    },
    onError: (error) => {
      Alert.alert('Error', (error as any)?.response?.data?.message || 'Failed to approve return');
    },
  });

  // Process refund
  const refundMutation = useMutation({
    mutationFn: async (returnId) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/admin/api/returns/${returnId}/refund-approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      refetch();
      Alert.alert('Success', 'Refund processed successfully');
    },
    onError: (error) => {
      Alert.alert('Error', (error as any)?.response?.data?.message || 'Failed to process refund');
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
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {['requested', 'approved_by_seller', 'item_received', 'pending_refund'].map((status) => (
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
              {status.replace(/_/g, ' ')}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {returns?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No returns to process</ThemedText>
        </View>
      ) : (
        returns?.map((returnItem: any) => (
          <ReturnCard
            key={returnItem._id}
            return={returnItem}
            onApprove={() => approveMutation.mutate(returnItem._id)}
            onRefund={() => refundMutation.mutate(returnItem._id)}
            loading={approveMutation.isPending || refundMutation.isPending}
          />
        ))
      )}
    </ScrollView>
  );
}

function ReturnCard({ return: returnItem, onApprove, onRefund, loading }: any) {
  const theme = useTheme();
  const statusColors = {
    requested: '#FEF3C7',
    approved_by_seller: '#DBEAFE',
    item_received: '#D1FAE5',
    pending_refund: '#FCE7F3',
  };

  const status = returnItem.status as string;
  const colors = statusColors as any;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.returnNumber}>Return #{returnItem.returnNumber}</ThemedText>
          <ThemedText style={styles.orderId}>Order: {returnItem.orderId}</ThemedText>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors[status] },
          ]}
        >
          <ThemedText style={styles.badgeText}>{returnItem.status}</ThemedText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <DetailRow label="Reason:" value={returnItem.reason} />
        <DetailRow label="Refund Amount:" value={`₦${returnItem.refundAmount}`} />
        <DetailRow label="Product Condition:" value={returnItem.condition} />
      </View>

      <View style={styles.divider} />

      <View style={styles.timeline}>
        <ThemedText style={styles.timelineTitle}>Timeline</ThemedText>
        <TimelineItem icon="📋" label="Requested" date={returnItem.requestedAt} />
        {returnItem.approvedAt && (
          <TimelineItem icon="✅" label="Approved" date={returnItem.approvedAt} />
        )}
        {returnItem.itemReceivedAt && (
          <TimelineItem icon="📦" label="Received" date={returnItem.itemReceivedAt} />
        )}
      </View>

      {returnItem.status === 'requested' && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3B82F6' }]}
          onPress={onApprove}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Approving...' : 'Approve Return'}
          </ThemedText>
        </TouchableOpacity>
      )}

      {returnItem.status === 'item_received' && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#10B981' }]}
          onPress={onRefund}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Processing...' : 'Process Refund'}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function TimelineItem({ icon, label, date }: any) {
  return (
    <View style={styles.timelineItem}>
      <ThemedText style={styles.timelineIcon}>{icon}</ThemedText>
      <View style={styles.timelineContent}>
        <ThemedText style={styles.timelineLabel}>{label}</ThemedText>
        <ThemedText style={styles.timelineDate}>
          {new Date(date).toLocaleDateString()}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  returnNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 12,
    opacity: 0.6,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  details: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '60%',
  },
  timeline: {
    marginVertical: 10,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: 11,
    opacity: 0.6,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
