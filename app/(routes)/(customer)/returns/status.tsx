import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useIsFocused , useTheme } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URI || 'https://ecommerce-dating-app.onrender.com';

export default function ReturnStatusScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  // Fetch returns
  const { data: returns, isLoading, refetch } = useQuery({
    queryKey: ['my-returns'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/marketplace/api/returns/my-returns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.returns || [];
    },
    enabled: isFocused,
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
      {returns?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>📦</ThemedText>
          <ThemedText style={styles.emptyText}>No return requests yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Your return requests will appear here
          </ThemedText>
        </View>
      ) : (
        returns?.map((returnItem: any) => (
          <ReturnCard key={returnItem._id} return={returnItem} />
        ))
      )}
    </ScrollView>
  );
}

function ReturnCard({ return: returnItem }: any) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const statusSteps = [
    { step: 'Requested', icon: '📋', status: 'requested' },
    { step: 'Seller Review', icon: '👤', status: 'approved_by_seller' },
    { step: 'Shipping Label', icon: '📮', status: 'label_generated' },
    { step: 'Item Shipped', icon: '🚚', status: 'item_shipped_back' },
    { step: 'Item Received', icon: '📦', status: 'item_received' },
    { step: 'Verification', icon: '✓', status: 'verified' },
    { step: 'Refund Approved', icon: '✅', status: 'refund_approved' },
    { step: 'Refunded', icon: '💰', status: 'refund_completed' },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.status === returnItem.status);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.cardHeader}
      >
        <View style={styles.headerLeft}>
          <ThemedText style={styles.returnNumber}>
            Return #{returnItem.returnNumber}
          </ThemedText>
          <ThemedText style={styles.reason}>{returnItem.reason}</ThemedText>
        </View>
        <ThemedText style={styles.expandIcon}>{expanded ? '▼' : '▶'}</ThemedText>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Timeline */}
          <View style={styles.timeline}>
            {statusSteps.map((item, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={item.status} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineCircle,
                      {
                        backgroundColor: isCompleted ? '#10B981' : '#E5E7EB',
                      },
                    ]}
                  >
                    <ThemedText style={styles.timelineIcon}>
                      {isCompleted ? '✓' : item.icon}
                    </ThemedText>
                  </View>

                  <View style={styles.timelineContent}>
                    <ThemedText
                      style={[
                        styles.timelineLabel,
                        isCurrent && { fontWeight: '700' },
                      ]}
                    >
                      {item.step}
                    </ThemedText>
                    {isCurrent && (
                      <ThemedText style={styles.timelineStatus}>
                        In progress
                      </ThemedText>
                    )}
                  </View>

                  {index < statusSteps.length - 1 && (
                    <View
                      style={[
                        styles.timelineConnector,
                        {
                          backgroundColor: isCompleted ? '#10B981' : '#E5E7EB',
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Details */}
          <View style={styles.details}>
            <DetailRow
              label="Return Number"
              value={returnItem.returnNumber}
            />
            <DetailRow label="Reason" value={returnItem.reason} />
            <DetailRow
              label="Refund Amount"
              value={`₦${returnItem.refundAmount?.toLocaleString()}`}
            />
            <DetailRow
              label="Requested Date"
              value={new Date(returnItem.requestedAt).toLocaleDateString()}
            />
            {returnItem.returnTrackingNumber && (
              <DetailRow
                label="Return Tracking"
                value={returnItem.returnTrackingNumber}
              />
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {returnItem.status === 'label_generated' && returnItem.shippingLabel && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => {
                  // Open shipping label
                  alert('Shipping label would open here');
                }}
              >
                <ThemedText style={styles.actionButtonText}>
                  📥 Download Shipping Label
                </ThemedText>
              </TouchableOpacity>
            )}

            {returnItem.status === 'requested' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  alert('Return would be cancelled');
                }}
              >
                <ThemedText style={styles.actionButtonText}>Cancel Return</ThemedText>
              </TouchableOpacity>
            )}

            {returnItem.status === 'refund_completed' && (
              <View style={[styles.completionMessage, { backgroundColor: '#D1FAE5' }]}>
                <ThemedText style={{ color: '#10B981', fontWeight: '600' }}>
                  ✓ Refund Completed
                </ThemedText>
              </View>
            )}
          </View>
        </>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    opacity: 0.6,
  },
  card: {
    marginVertical: 10,
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
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  returnNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    opacity: 0.6,
  },
  expandIcon: {
    fontSize: 12,
    opacity: 0.5,
  },
  timeline: {
    marginVertical: 20,
    marginLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  timelineContent: {
    flex: 1,
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineStatus: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
  },
  timelineConnector: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 40,
  },
  details: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginVertical: 10,
  },
  actionButton: {
    padding: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  completionMessage: {
    padding: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
