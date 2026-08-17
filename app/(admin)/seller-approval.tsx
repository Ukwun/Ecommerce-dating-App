import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
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

export default function SellerApprovalScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fetch pending sellers
  const { data: sellers, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-sellers'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${API_BASE_URL}/admin/api/sellers?status=pending&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.sellers || [];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (sellerId: string) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/admin/api/sellers/${sellerId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      refetch();
      Alert.alert('Success', 'Seller approved successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to approve seller');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (sellerId: string) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/admin/api/sellers/${sellerId}/reject`,
        { reason: rejectReason || 'Seller does not meet requirements' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      refetch();
      setShowRejectModal(false);
      setRejectReason('');
      Alert.alert('Success', 'Seller rejected');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to reject seller');
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
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
          <ThemedText style={styles.errorTitle}>Failed to Load Sellers</ThemedText>
          <ThemedText style={styles.errorMessage}>
            {(error as any)?.response?.data?.message || 'Unable to connect to the server'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.errorButtonText}>🔄 Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {sellers?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>✅ No pending sellers</ThemedText>
            <ThemedText style={styles.emptySubtext}>All seller applications have been reviewed</ThemedText>
          </View>
        ) : (
          sellers?.map((seller: any) => (
            <SellerCard
              key={seller._id}
              seller={seller}
              onApprove={() => approveMutation.mutate(seller._id)}
              onReject={() => {
                setSelectedSeller(seller);
                setShowRejectModal(true);
              }}
              loading={approveMutation.isPending || rejectMutation.isPending}
            />
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.modalTitle}>Reject Seller Application</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Business: {(selectedSeller as any)?.businessName}
            </ThemedText>

            <TextInput
              style={[
                styles.reasonInput,
                { 
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Reason for rejection..."
              placeholderTextColor="#999"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#E5E7EB' }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                onPress={() => rejectMutation.mutate((selectedSeller as any)?._id)}
                disabled={rejectMutation.isPending}
              >
                <ThemedText style={[styles.modalButtonText, { color: '#fff' }]}>
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SellerCard({ seller, onApprove, onReject, loading }: any) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.businessName}>{seller.businessName}</ThemedText>
          <ThemedText style={styles.category}>{seller.businessCategory}</ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
          ]}
        >
          <ThemedText style={styles.statusText}>⏳ Pending</ThemedText>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <DetailRow label="Registration Number:" value={seller.registrationNumber} />
        <DetailRow
          label="Seller Name:"
          value={seller.userId?.firstName + ' ' + seller.userId?.lastName}
        />
        <DetailRow label="Email:" value={seller.userId?.email} />
        <DetailRow label="Phone:" value={seller.userId?.phone} />
      </View>

      <View style={styles.verificationContainer}>
        <ThemedText style={styles.verificationTitle}>Verification Status</ThemedText>
        <VerificationItem label="BVN Verified" status={seller.bvnVerified} />
        <VerificationItem label="NIN Verified" status={seller.ninVerified} />
        <VerificationItem label="Bank Details Verified" status={!!seller.bankDetails?.verified} />
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#EF4444' }]}
          onPress={onReject}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>❌ Reject</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#10B981' }]}
          onPress={onApprove}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>✅ Approve</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value || 'N/A'}</ThemedText>
    </View>
  );
}

function VerificationItem({ label, status }: any) {
  return (
    <View style={styles.verificationItem}>
      <ThemedText style={styles.verificationLabel}>
        {status ? '✅' : '❌'} {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  errorContainer: {
    flex: 1,
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
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 6,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
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
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    opacity: 0.6,
  },
  statusBadge: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    marginVertical: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
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
  },
  verificationContainer: {
    marginVertical: 10,
  },
  verificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  verificationItem: {
    paddingVertical: 6,
  },
  verificationLabel: {
    fontSize: 13,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 15,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
});
