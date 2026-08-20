import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery, useMutation } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import { router } from 'expo-router';

export default function SellerProfileScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({
    businessName: '',
    businessCategory: '',
    registrationNumber: '',
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
    },
  });

  // Fetch seller profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      const response = await axiosInstance.get('/seller/api/profile');
      setFormData(response.data.data);
      return response.data.data;
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      return axiosInstance.put('/seller/api/profile', formData);
    },
    onSuccess: () => {
      refetch();
      setEditMode(false);
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
      {/* Business Info */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Business Information</ThemedText>
          <TouchableOpacity onPress={() => setEditMode(!editMode)}>
            <ThemedText style={styles.editButton}>{editMode ? '✓ Done' : '✏️ Edit'}</ThemedText>
          </TouchableOpacity>
        </View>

        <ProfileField
          label="Business Name"
          value={formData.businessName || ''}
          editable={editMode}
          onChangeText={(text: string) => setFormData({ ...formData, businessName: text })}
        />
        <ProfileField
          label="Business Category"
          value={formData.businessCategory || ''}
          editable={editMode}
          onChangeText={(text: string) => setFormData({ ...formData, businessCategory: text })}
        />
        <ProfileField
          label="Registration Number"
          value={formData.registrationNumber || ''}
          editable={editMode}
          onChangeText={(text: string) => setFormData({ ...formData, registrationNumber: text })}
        />
      </View>

      {/* Verification Status */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Verification Status</ThemedText>

        <VerificationRow
          label="BVN Verification"
          status={profile?.bvnVerified ? 'Verified' : 'Pending'}
          icon={profile?.bvnVerified ? '✅' : '⏳'}
        />
        <VerificationRow
          label="NIN Verification"
          status={profile?.ninVerified ? 'Verified' : 'Pending'}
          icon={profile?.ninVerified ? '✅' : '⏳'}
        />
        <VerificationRow
          label="Business Registration"
          status={profile?.verificationStatus}
          icon={profile?.verificationStatus === 'approved' ? '✅' : '⏳'}
        />
      </View>

      {/* Bank Details */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Bank Details</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(seller)/seller-finance' as any)}>
            <ThemedText style={styles.editButton}>{editMode ? '✓ Done' : '✏️ Edit'}</ThemedText>
          </TouchableOpacity>
        </View>

        <ProfileField
          label="Bank Name"
          value={formData.bankDetails?.bankName || ''}
          editable={false}
          onChangeText={(text: string) =>
            setFormData({
              ...formData,
              bankDetails: { ...formData.bankDetails, bankName: text },
            })
          }
        />
        <ProfileField
          label="Account Name"
          value={formData.bankDetails?.accountName || ''}
          editable={false}
          onChangeText={(text: string) =>
            setFormData({
              ...formData,
              bankDetails: { ...formData.bankDetails, accountName: text },
            })
          }
        />
        <ProfileField
          label="Account Number"
          value={formData.bankDetails?.accountNumber || ''}
          editable={false}
          onChangeText={(text: string) =>
            setFormData({
              ...formData,
              bankDetails: { ...formData.bankDetails, accountNumber: text },
            })
          }
        />
      </View>

      {/* Performance Stats */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>Performance Stats</ThemedText>

        <StatsRow label="Total Orders" value={profile?.totalOrders} />
        <StatsRow label="Customer Rating" value={`${profile?.averageRating?.toFixed(1)}/5`} />
        <StatsRow label="Total Earnings" value={`₦${profile?.totalEarnings?.toLocaleString()}`} />
        <StatsRow label="Return Rate" value={`${profile?.returnRate?.toFixed(1)}%`} />
      </View>

      {editMode && (
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          <ThemedText style={styles.saveButtonText}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </ThemedText>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function ProfileField({ label, value, editable, onChangeText }: any) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        style={[
          styles.fieldInput,
          {
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: editable ? theme.colors.background : '#F3F4F6',
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholderTextColor="#999"
      />
    </View>
  );
}

function VerificationRow({ label, status, icon }: any) {
  return (
    <View style={styles.verificationRow}>
      <ThemedText style={styles.verificationLabel}>
        {icon} {label}
      </ThemedText>
      <ThemedText style={styles.verificationStatus}>{status}</ThemedText>
    </View>
  );
}

function StatsRow({ label, value }: any) {
  return (
    <View style={styles.statsRow}>
      <ThemedText style={styles.statsLabel}>{label}</ThemedText>
      <ThemedText style={styles.statsValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginVertical: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  field: {
    marginVertical: 10,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
    opacity: 0.7,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  verificationLabel: {
    fontSize: 13,
  },
  verificationStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  statsValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    marginHorizontal: 10,
    marginVertical: 15,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
