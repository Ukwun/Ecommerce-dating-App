import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCheckout } from '@/hooks/CheckoutContext';
import Toast from 'react-native-toast-message';

type PaymentMethod = {
  _id: string;
  cardType: 'visa' | 'mastercard' | 'verve';
  last4: string;
  isDefault: boolean;
};

const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  // Mock data. Replace with your actual API call.
  return [
    { _id: '1', cardType: 'visa', last4: '1234', isDefault: true },
    { _id: '2', cardType: 'mastercard', last4: '5678', isDefault: false },
    { _id: '3', cardType: 'verve', last4: '9012', isDefault: false },
  ];
};

const removePaymentMethod = async (methodId: string) => {
  // Simulate API call
  console.log('Removing payment method:', methodId);
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
};

const getCardIcon = (cardType: string) => {
  switch (cardType) {
    case 'visa': return 'cc-visa';
    case 'mastercard': return 'cc-mastercard';
    case 'verve': return 'credit-card-outline'; // No specific Verve icon, using a generic one
    default: return 'credit-card';
  }
};

const PaymentMethodItem = ({ item, onSelect, isSelected, onRemove, isSelectionMode }: { item: PaymentMethod; onSelect: (item: PaymentMethod) => void; isSelected: boolean; onRemove: (id: string) => void; isSelectionMode: boolean; }) => (
  <TouchableOpacity
    style={[styles.card, isSelected && styles.selectedCard]}
    onPress={() => isSelectionMode && onSelect(item)}
    activeOpacity={0.7}
    disabled={!isSelectionMode}
  >
    <View style={styles.cardIcon}>
      <MaterialCommunityIcons name={getCardIcon(item.cardType) as any} size={36} color="#111827" />
    </View>
    <View style={styles.cardDetails}>
      <Text style={styles.cardText}>**** **** **** {item.last4}</Text>
      {item.isDefault && (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>Default</Text>
        </View>
      )}
    </View>
    {isSelectionMode ? (
      <View style={styles.selectIcon}>
        <Ionicons
          name={isSelected ? "checkmark-circle" : "radio-button-off"}
          size={24}
          color={isSelected ? "#FF8C00" : "#ccc"}
        />
      </View>
    ) : (
      <TouchableOpacity style={styles.removeButton} onPress={() => onRemove(item._id)}>
        <Ionicons name="trash-outline" size={22} color="#EF4444" />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

export default function PaymentMethodsScreen() {
  const { selectionMode } = useLocalSearchParams<{ selectionMode?: string }>();
  const { selectedPaymentMethod, setSelectedPaymentMethod } = useCheckout();
  const queryClient = useQueryClient();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: fetchPaymentMethods,
  });

  const removeMutation = useMutation({
    mutationFn: removePaymentMethod,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment Method Removed' });
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Failed to remove method', text2: error.message });
    },
  });

  const handleRemove = (id: string) => {
    Alert.alert(
      "Remove Payment Method",
      "Are you sure you want to remove this card?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate(id) }
      ]
    );
  };

  const handleSelect = (item: PaymentMethod) => {
    if (selectionMode) {
      setSelectedPaymentMethod(item);
      router.back();
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <TouchableOpacity onPress={() => router.push('/(routes)/payment/add')} style={styles.addButton}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={paymentMethods}
            renderItem={({ item }) => (
              <PaymentMethodItem
                item={item}
                onSelect={handleSelect}
                onRemove={handleRemove}
                isSelectionMode={!!selectionMode}
                isSelected={selectedPaymentMethod?._id === item._id}
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
  addButton: { padding: 4 },
  listContainer: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: '#FF8C00',
    borderWidth: 2,
  },
  cardIcon: {
    marginRight: 16,
  },
  cardDetails: {
    flex: 1,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 1.5,
  },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  defaultBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectIcon: {
    marginLeft: 16,
  },
  removeButton: {
    marginLeft: 16,
    padding: 8,
  },
});
