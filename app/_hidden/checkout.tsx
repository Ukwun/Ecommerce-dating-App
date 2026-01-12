import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
// Importing at runtime to avoid TS JSX typing issues for this native webview module
// We'll require it dynamically and render via React.createElement
import { useCart } from '@/hooks/CartContext';
import { useCheckout, PaymentMethod } from '@/hooks/CheckoutContext';
import { getCachedRates, convert } from '@/utils/currency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/AuthContext';
import axiosInstance from '@/utils/axiosinstance';
import MapView, { Marker } from 'react-native-maps';

const Section = ({ title, children, actionText, onActionPress }: { title: string, children: React.ReactNode, actionText?: string, onActionPress?: () => void }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
    <View style={styles.card}>
      {children}
    </View>
  </View>
);

const placeOrder = async (orderData: any) => {
  // Call the real backend endpoint
  const response = await axiosInstance.post('/marketplace/api/orders', orderData);
  // Return the data in the format expected by the mutation onSuccess
  return response.data;
};

export default function CheckoutScreen() {
  const { items, clearCart } = useCart();
  const { user } = useAuth(); // Get user from AuthContext
  const { 
    selectedAddress, 
    setSelectedAddress, 
    selectedPaymentMethod, 
    setSelectedPaymentMethod,
    currency,
    deliveryOption,
    setDeliveryOption
  } = useCheckout();
  const paystackWebViewRef = useRef<{ startTransaction: () => void; endTransaction: () => void; } | null>(null);
  const queryClient = useQueryClient();
  // Fetch addresses and set the default one if no address is selected yet
  const { data: addresses } = useQuery({
    queryKey: ['shippingAddresses'],
    queryFn: async () => {
      // This is mock data. Replace with your actual API call.
      const mockAddresses = [
        { _id: '1', name: 'John Doe', addressLine1: '123 Main Street, Apt 4B', city: 'Ikeja', state: 'Lagos', postalCode: '100212', country: 'Nigeria', isDefault: true },
        { _id: '2', name: 'John Doe', addressLine1: '456 Work Avenue, Suite 500', city: 'Victoria Island', state: 'Lagos', postalCode: '101241', country: 'Nigeria', isDefault: false },
      ];
      return mockAddresses;
    },
  });

  // Fetch payment methods and set the default one
  const { data: paymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      // Mock data with explicit type.
      const mockMethods: PaymentMethod[] = [
        { _id: '1', cardType: 'visa', last4: '1234', isDefault: true },
        { _id: '2', cardType: 'mastercard', last4: '5678', isDefault: false },
        { _id: 'bank_transfer', cardType: 'bank' as any, last4: 'Transfer', isDefault: false },
      ];
      return mockMethods;
    },
  });

  useEffect(() => {
    if (!selectedAddress && addresses) {
      const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    }
    if (!selectedPaymentMethod && paymentMethods) {
      const defaultMethod = paymentMethods.find(method => method.isDefault) || paymentMethods[0];
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    }
  }, [addresses, paymentMethods, selectedAddress, selectedPaymentMethod, setSelectedAddress, setSelectedPaymentMethod]);

  const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? (deliveryOption === 'station' ? 0 : 500) : 0;
  const total = subtotal + shipping;

  const fmt = (amount: number) => {
    if (currency === 'USD') return `$${(amount / 1200).toFixed(2)}`;
    if (currency === 'EUR') return `€${(amount / 1300).toFixed(2)}`;
    return `₦${amount.toLocaleString()}`;
  };

  const [rates, setRates] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await getCachedRates('NGN', [currency]);
        if (mounted) setRates(r);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [currency]);

  const convertAmount = async (amountNgn: number) => {
    try {
      if (currency === 'NGN') return amountNgn;
      const converted = await convert(amountNgn, 'NGN', currency);
      return Number(converted);
    } catch (e) {
      return amountNgn;
    }
  };

  const orderMutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: (data) => {
      clearCart();
      router.replace({ pathname: '/order-confirmation', params: { orderId: data.orderId, total: total.toString() } } as any);
    },
    onError: (error: any) => {
      // Show visible error to user
      const message = error.response?.data?.error || error.message || "Failed to place order. Please try again.";
      Alert.alert("Order Failed", message);
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedAddress || !selectedPaymentMethod) {
      console.error("Cannot place order without selected address and payment method.");
      // Optionally show a user-facing error
      return;
    }
    orderMutation.mutate({
      items: items.map(item => ({ productId: item._id, quantity: item.quantity, price: item.price })),
      shippingAddressId: selectedAddress._id,
      paymentMethodId: selectedPaymentMethod._id,
      subtotal,
      shipping,
      total,
      currency,
      deliveryOption,
    });
  };

  const handlePaymentInitiation = () => {
    if ((deliveryOption === 'home' && !selectedAddress) || items.length === 0) {
      // Add user feedback here, e.g., a Toast message
      alert('Please ensure your cart and delivery details are set.');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method', 'Please select a payment method.');
      return;
    }

    if (selectedPaymentMethod._id === 'bank_transfer') {
      // Handle manual bank transfer flow
      Alert.alert('Bank Transfer', 'Please transfer the total amount to:\n\nBank: GTBank\nAccount: 0123456789\nName: Marketplace App\n\nClick OK once sent.', [{ text: 'I have sent it', onPress: handlePlaceOrder }, { text: 'Cancel', style: 'cancel' }]);
    } else {
      if (paystackWebViewRef.current) {
        paystackWebViewRef.current.startTransaction();
      } else {
        Alert.alert(
          'Development Mode',
          'Native payment modules are not available in Expo Go/Simulator.\n\nClick "Simulate Success" to complete the order for testing.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Simulate Success', onPress: handlePlaceOrder }
          ]
        );
      }
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      {(() => {
        try {
          // require at runtime and defensively handle multiple export shapes
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('react-native-paystack-webview');
          // Common shapes: module default export is the component, or named export like PaystackWebView
          const Candidate = typeof mod === 'function'
            ? mod
            : (mod && (mod.default ?? mod.PaystackWebView ?? mod.Paystack ?? mod.PaystackPayment)) ?? null;

          // Ensure the candidate is a component (function or class)
          if (Candidate && (typeof Candidate === 'function' || typeof Candidate === 'object')) {
            // If it's an object that looks like a React element (already created), clone it with props
            // but most native modules export a component (function/class), so prefer createElement when function
            if (typeof Candidate === 'function') {
              return React.createElement(Candidate as any, {
                paystackKey: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
                billingEmail: user?.email || 'customer@example.com',
                amount: total,
                onCancel: (e: any) => { console.log('Payment cancelled', e); },
                onSuccess: (res: any) => { handlePlaceOrder(); },
                ref: paystackWebViewRef,
                autoStart: false,
              });
            }

            // If it's an object (possibly a namespace with a .default that is already an element), try to resolve default again
            const fallback = (Candidate as any).default ?? (Candidate as any).PaystackWebView;
            if (typeof fallback === 'function') {
              return React.createElement(fallback as any, {
                paystackKey: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
                billingEmail: user?.email || 'customer@example.com',
                amount: total,
                onCancel: (e: any) => { console.log('Payment cancelled', e); },
                onSuccess: (res: any) => { handlePlaceOrder(); },
                ref: paystackWebViewRef,
                autoStart: false,
              });
            }

            // If it's an object that looks like a React element (has $$typeof), return it directly (though unlikely)
            if ((Candidate as any)?.$$typeof) {
              return Candidate;
            }
          }

          // Module exists but no usable component found
          console.warn('Paystack module loaded but no usable component export found:', Object.keys(mod || {}));
          return null;
        } catch (e) {
          // If the native module isn't installed we simply render nothing
          console.warn('Paystack module not available:', e);
          return null;
        }
      })()}
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* conversion rate badge */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: '#FFF', fontSize: 13 }}>
            {currency === 'NGN' ? 'Prices shown in NGN' : rates && rates[currency] ? `1 NGN = ${rates[currency].toFixed(6)} ${currency}` : `Converting to ${currency}...`}
          </Text>
        </View>
  <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Shipping Address */}
          <Section title="Shipping Address" actionText="Change" onActionPress={() => router.push({ pathname: '/(routes)/shipping', params: { selectionMode: 'true' } } as any)}>
            <View style={styles.addressContainer}>
              <Ionicons name="location-sharp" size={24} color="#FF8C00" />
              {selectedAddress ? (
                <View style={styles.addressTextContainer}>
                  <Text style={styles.addressName}>{selectedAddress.name}</Text>
                  <Text style={styles.addressDetails}>{`${selectedAddress.addressLine1}, ${selectedAddress.city}, ${selectedAddress.state}`}</Text>
                </View>
              ) : (
                <Text style={styles.addressDetails}>No address selected</Text>
              )}
            </View>
          </Section>

          {/* Payment Method */}
          <Section title="Payment Method" actionText="Change" onActionPress={() => router.push({ pathname: '/(routes)/payment', params: { selectionMode: 'true' } } as any)}>
            <View style={styles.paymentContainer}>
              <MaterialCommunityIcons name="credit-card" size={24} color="#FF8C00" />
              {selectedPaymentMethod ? (
                <Text style={styles.paymentText}>{selectedPaymentMethod._id === 'bank_transfer' ? 'Direct Bank Transfer' : `**** **** **** ${selectedPaymentMethod.last4}`}</Text>
              ) : (
                <Text style={styles.paymentText}>No payment method</Text>
              )}
            </View>
          </Section>

          {/* Delivery Method */}
          <Section title="Delivery Method">
            <View style={styles.deliveryContainer}>
              <TouchableOpacity 
                style={[styles.deliveryOption, deliveryOption === 'home' && styles.deliveryOptionSelected]}
                onPress={() => setDeliveryOption('home')}
              >
                <Ionicons name="home" size={24} color={deliveryOption === 'home' ? '#FF8C00' : '#6B7280'} />
                <View style={styles.deliveryTextContainer}>
                  <Text style={[styles.deliveryTitle, deliveryOption === 'home' && styles.deliveryTitleSelected]}>Doorstep Delivery</Text>
                  <Text style={styles.deliverySubtitle}>Delivered to your address</Text>
                </View>
                <Text style={styles.deliveryPrice}>₦500</Text>
                {deliveryOption === 'home' && <Ionicons name="checkmark-circle" size={20} color="#FF8C00" />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.deliveryOption, deliveryOption === 'station' && styles.deliveryOptionSelected]}
                onPress={() => setDeliveryOption('station')}
              >
                <Ionicons name="business" size={24} color={deliveryOption === 'station' ? '#FF8C00' : '#6B7280'} />
                <View style={styles.deliveryTextContainer}>
                  <Text style={[styles.deliveryTitle, deliveryOption === 'station' && styles.deliveryTitleSelected]}>Pickup Station</Text>
                  <Text style={styles.deliverySubtitle}>Collect at our office</Text>
                </View>
                <Text style={styles.deliveryPrice}>Free</Text>
                {deliveryOption === 'station' && <Ionicons name="checkmark-circle" size={20} color="#FF8C00" />}
              </TouchableOpacity>
            </View>

            {deliveryOption === 'station' && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: 6.5244,
                    longitude: 3.3792,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: 6.5244, longitude: 3.3792 }}
                    title="Pickup Station"
                    description="123 Warehouse Road, Lagos"
                  />
                </MapView>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>Lagos Central Station</Text>
                  <Text style={styles.stationAddress}>123 Warehouse Road, Lagos</Text>
                </View>
              </View>
            )}
          </Section>

          {/* Order Summary */}
          <Section title="Order Summary">
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₦{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>₦{shipping.toLocaleString()}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
              <Text style={[styles.summaryValue, styles.totalLabel]}>₦{total.toLocaleString()}</Text>
            </View>
          </Section>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.placeOrderButton, orderMutation.isPending && styles.placeOrderButtonDisabled]} onPress={handlePaymentInitiation} disabled={orderMutation.isPending}>
            {orderMutation.isPending ? (
              <ActivityIndicator color="#111827" />
            ) : (
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 24 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { paddingVertical: 16, paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  actionText: { fontSize: 14, color: '#FFD700', fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 16 },
  addressContainer: { flexDirection: 'row', alignItems: 'center' },
  addressTextContainer: { marginLeft: 12, flex: 1 },
  addressName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  addressDetails: { fontSize: 14, color: '#444', marginTop: 4 },
  paymentContainer: { flexDirection: 'row', alignItems: 'center' },
  paymentText: { fontSize: 16, color: '#111827', marginLeft: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 16, color: '#444' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  totalLabel: { fontWeight: 'bold', fontSize: 18 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  placeOrderButton: { backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  placeOrderButtonDisabled: {
    backgroundColor: '#FDBA74',
  },
  placeOrderButtonText: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  deliveryContainer: {
    gap: 12,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  deliveryOptionSelected: {
    borderColor: '#FF8C00',
    backgroundColor: '#FFF7ED',
  },
  deliveryTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryTitleSelected: {
    color: '#FF8C00',
  },
  deliverySubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 8,
  },
  mapContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: 150,
  },
  stationInfo: {
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  stationName: {
    fontWeight: 'bold',
    color: '#111827',
  },
  stationAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
