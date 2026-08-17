import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useCart } from '@/hooks/CartContext';
import { useAuth } from '@/hooks/AuthContext';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import { useCheckout } from '@/hooks/CheckoutContext';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { selectedPaymentMethod } = useCheckout();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  // Address Form
  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
  });

  // Shipping
  const [shippingMethod, setShippingMethod] = useState('standard');
  const shippingCosts = { standard: 1000, express: 2500 };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = shippingCosts[shippingMethod as keyof typeof shippingCosts] || 1000;
  const tax = Math.round(subtotal * 0.075);
  const total = subtotal + shippingCost + tax;

  const handleAddressChange = (field: string, value: string) => {
    setAddress({ ...address, [field]: value });
  };

  const validateAddress = () => {
    if (!address.name || !address.phone || !address.addressLine1 || !address.city || !address.state || !address.postalCode) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all fields' });
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    setLoading(true);
    try {
      const orderData = {
        products: items.map(item => ({
          product: item._id,
          quantity: item.quantity,
        })),
        shippingAddress: address,
        shippingCost,
      };

      const response = pendingOrder
        ? { data: { success: true, data: pendingOrder } }
        : await axiosInstance.post('/marketplace/api/orders', orderData);

      if (response.data.success) {
        const order = response.data.data;
        setPendingOrder(order);
        let paymentReference: string;
        let authorizationUrl: string | undefined;
        if (selectedPaymentMethod) {
          const charged = await axiosInstance.post('/marketplace/api/payments/charge-saved', {
            orderId: order._id,
            paymentMethodId: selectedPaymentMethod._id,
          });
          paymentReference = charged.data.data.reference;
          authorizationUrl = charged.data.data.authorization_url;
        } else {
          const initialized = await axiosInstance.post('/marketplace/api/payments/initialize', { orderId: order._id });
          paymentReference = initialized.data.data.reference;
          authorizationUrl = initialized.data.data.authorizationUrl;
        }
        if (authorizationUrl) {
          const paymentResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, 'marketplace://payment-complete');
          if (paymentResult.type !== 'success') throw new Error('Payment was not completed');
        }
        await axiosInstance.post('/marketplace/api/payments/verify', { reference: paymentReference });
        setPendingOrder(null);
        Toast.show({
          type: 'success',
          text1: 'Payment confirmed',
          text2: `Order #${order.orderNumber}`,
        });

        clearCart();
        setTimeout(() => {
          router.replace({
            pathname: '/(routes)/order-confirmation',
            params: { orderId: order._id, orderNumber: order.orderNumber },
          } as any);
        }, 1000);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Order Failed',
        text2: error.response?.data?.error || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => router.back()}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Checkout</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {['Address', 'Shipping', 'Review'].map((label, idx) => (
            <View key={idx} style={styles.step}>
              <View
                style={[
                  styles.stepCircle,
                  idx <= currentStep && styles.stepCircleActive,
                ]}
              >
                {idx < currentStep ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : (
                  <Text style={styles.stepNumber}>{idx + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, idx <= currentStep && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Content */}
        <AnimatedView entering={FadeInDown} style={styles.content}>
          {currentStep === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>

              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={address.name}
                onChangeText={(v) => handleAddressChange('name', v)}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={address.phone}
                onChangeText={(v) => handleAddressChange('phone', v)}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Street Address"
                value={address.addressLine1}
                onChangeText={(v) => handleAddressChange('addressLine1', v)}
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="City"
                  value={address.city}
                  onChangeText={(v) => handleAddressChange('city', v)}
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 12 }]}
                  placeholder="State"
                  value={address.state}
                  onChangeText={(v) => handleAddressChange('state', v)}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Postal Code"
                value={address.postalCode}
                onChangeText={(v) => handleAddressChange('postalCode', v)}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {currentStep === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shipping Method</Text>

              {['standard', 'express'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.shippingOption,
                    shippingMethod === method && styles.shippingOptionSelected,
                  ]}
                  onPress={() => setShippingMethod(method)}
                >
                  <View style={styles.shippingInfo}>
                    <Text style={styles.shippingLabel}>
                      {method === 'standard' ? '📦 Standard Delivery' : '🚀 Express Delivery'}
                    </Text>
                    <Text style={styles.shippingDetails}>
                      {method === 'standard' ? '3-5 business days' : '1-2 business days'}
                    </Text>
                  </View>
                  <Text style={styles.shippingCost}>₦{shippingCosts[method as keyof typeof shippingCosts]}</Text>
                  <Ionicons
                    name={shippingMethod === method ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={shippingMethod === method ? '#FF8C00' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>

              {items.map((item) => (
                <View key={item._id} style={styles.orderItem}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}

              <LinearGradient
                colors={['#fff5f0', '#fff']}
                style={styles.totalsCard}
              >
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>₦{subtotal.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Shipping</Text>
                  <Text style={styles.totalValue}>₦{shippingCost.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax (7.5%)</Text>
                  <Text style={styles.totalValue}>₦{tax.toLocaleString()}</Text>
                </View>
                <View style={[styles.totalRow, styles.totalRowFinal]}>
                  <Text style={styles.totalLabelFinal}>Total</Text>
                  <Text style={styles.totalValueFinal}>₦{total.toLocaleString()}</Text>
                </View>
              </LinearGradient>
              <TouchableOpacity style={styles.paymentSelector} onPress={() => router.push({ pathname: '/(routes)/payment', params: { selectionMode: 'true' } } as any)}>
                <Ionicons name="card-outline" size={22} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{selectedPaymentMethod ? `${selectedPaymentMethod.cardType} •••• ${selectedPaymentMethod.last4}` : 'Pay securely with Paystack'}</Text>
                  <Text style={styles.paymentSubtitle}>{selectedPaymentMethod ? 'Saved card selected' : 'Card, bank transfer, USSD and supported methods'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
        </AnimatedView>

        <View style={styles.spacing} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(currentStep - 1)}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { flex: currentStep === 0 ? 1 : undefined }]}
          onPress={() => {
            if (currentStep === 2) {
              handlePlaceOrder();
            } else {
              if (currentStep === 0 && !validateAddress()) return;
              setCurrentStep(currentStep + 1);
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {currentStep === 2 ? '💳 Place Order' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#6B7280', marginVertical: 16 },
  continueShoppingButton: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: '#FF8C00', borderRadius: 24 },
  continueShoppingText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerPlaceholder: { width: 24 },
  stepsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 32 },
  step: { alignItems: 'center', gap: 8 },
  stepCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  stepNumber: { fontSize: 16, fontWeight: 'bold', color: '#9CA3AF' },
  stepLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  stepLabelActive: { color: '#FF8C00', fontWeight: '600' },
  content: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 15, color: '#111827' },
  rowInputs: { flexDirection: 'row' },
  shippingOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 12 },
  shippingOptionSelected: { borderColor: '#FF8C00', backgroundColor: '#fff5f0' },
  shippingInfo: { flex: 1 },
  shippingLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  shippingDetails: { fontSize: 13, color: '#6B7280' },
  shippingCost: { fontSize: 16, fontWeight: 'bold', color: '#FF8C00', marginRight: 12 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  itemQty: { fontSize: 13, color: '#6B7280', marginRight: 12 },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#FF8C00' },
  totalsCard: { marginTop: 16, borderRadius: 12, padding: 16 },
  paymentSelector: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 12, backgroundColor: '#EFF6FF' },
  paymentTitle: { fontWeight: '700', color: '#111827' },
  paymentSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRowFinal: { borderTopWidth: 1.5, borderTopColor: '#FFE4D6', paddingTop: 12, marginBottom: 0 },
  totalLabelFinal: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  totalValueFinal: { fontSize: 18, fontWeight: 'bold', color: '#FF8C00' },
  spacing: { height: 40 },
  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  secondaryButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6' },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  primaryButton: { flex: 1, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FF8C00', justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
});
