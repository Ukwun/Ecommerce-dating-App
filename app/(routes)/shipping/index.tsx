import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useCheckout } from '@/hooks/CheckoutContext';

type Address = {
  _id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const fetchAddresses = async (): Promise<Address[]> => {
  // In a real app, this would fetch addresses for the logged-in user.
  // For now, we'll use mock data as the endpoint doesn't exist yet.
  // const response = await axiosInstance.get('/user/api/addresses');
  // return response.data.addresses;

  return [
    { _id: '1', name: 'John Doe', addressLine1: '123 Main Street, Apt 4B', city: 'Ikeja', state: 'Lagos', postalCode: '100212', country: 'Nigeria', isDefault: true },
    { _id: '2', name: 'John Doe', addressLine1: '456 Work Avenue, Suite 500', city: 'Victoria Island', state: 'Lagos', postalCode: '101241', country: 'Nigeria', isDefault: false },
  ];
};

const removeAddress = async (addressId: string) => {
  // Simulate API call
  console.log('Removing address:', addressId);
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
};

const AddressItem = ({ item, onEdit, onRemove, onSelect, isSelectionMode, isSelected }: { item: Address; onEdit: (item: Address) => void; onRemove: (id: string) => void; onSelect: (item: Address) => void; isSelectionMode: boolean; isSelected: boolean; }) => (
  <TouchableOpacity
    style={[styles.addressCard, isSelectionMode && isSelected && styles.selectedAddressCard]}
    onPress={() => isSelectionMode && onSelect(item)}
    disabled={!isSelectionMode}
    activeOpacity={0.7}
  >
    {isSelectionMode && (
      <View style={styles.selectIcon}>
        <Ionicons 
          name={isSelected ? "checkmark-circle" : "radio-button-off"} 
          size={24} 
          color={isSelected ? "#FF8C00" : "#ccc"} 
        />
      </View>
    )}
    <View style={styles.cardHeader}>
      <Text style={styles.addressName}>{item.name}</Text>
      {item.isDefault && (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>Default</Text>
        </View>
      )}
    </View>
    <Text style={styles.addressText}>{item.addressLine1}</Text>
    <Text style={styles.addressText}>{`${item.city}, ${item.state} ${item.postalCode}`}</Text>
    <Text style={styles.addressText}>{item.country}</Text>
    {!isSelectionMode && (
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onRemove(item._id)}>
          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    )}
  </TouchableOpacity>
);

export default function ShippingAddressScreen() {
  const { selectionMode } = useLocalSearchParams<{ selectionMode?: string }>();
  const { selectedAddress, setSelectedAddress } = useCheckout();
  const { data: addresses, isLoading, isFetching } = useQuery({
    queryKey: ['shippingAddresses'],
    queryFn: fetchAddresses,
  });
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: removeAddress,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Address Removed' });
      queryClient.invalidateQueries({ queryKey: ['shippingAddresses'] });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Failed to remove address', text2: error.message });
    },
  });

  const handleRemove = (id: string) => {
    Alert.alert(
      "Remove Address",
      "Are you sure you want to remove this address?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate(id) }
      ]
    );
  };

  const handleEdit = (item: Address) => {
  // stringify boolean field so params conform to route params typing
  router.push({ pathname: '/(routes)/shipping/edit', params: { ...item, isDefault: String(item.isDefault) } as any });
  };

  const handleSelect = (item: Address) => {
    setSelectedAddress(item);
    router.back();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="map-marker-off-outline" size={80} color="rgba(255,255,255,0.7)" />
      <Text style={styles.emptyText}>No Addresses Saved</Text>
      <Text style={styles.emptySubText}>Add a new shipping address to get started.</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipping Addresses</Text>
          <TouchableOpacity onPress={() => router.push('/(routes)/shipping/add')} style={styles.addButton}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading && !isFetching ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={addresses}
            renderItem={({ item }) => (
              <AddressItem 
                item={item} 
                onEdit={handleEdit} 
                onRemove={handleRemove} 
                onSelect={handleSelect} 
                isSelectionMode={!!selectionMode}
                isSelected={selectedAddress?._id === item._id}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmpty}
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
  addButton: { padding: 4 },
  listContainer: { padding: 16 },
  addressCard: { 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    paddingLeft: 50, // Make space for the selection icon
    position: 'relative',
  },
  selectedAddressCard: {
    borderColor: '#FF8C00',
    borderWidth: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addressName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  defaultBadge: { backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  defaultBadgeText: { color: '#065F46', fontSize: 12, fontWeight: 'bold' },
  addressText: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  actionButton: {},
  actionButtonText: { color: '#FF8C00', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16 },
  emptySubText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginTop: 8, textAlign: 'center' },
  selectIcon: { position: 'absolute', left: 16, top: '50%', transform: [{ translateY: -12 }] },
});