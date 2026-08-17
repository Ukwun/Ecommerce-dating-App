import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart } from '@/hooks/CartContext';
import { useAuth } from '@/hooks/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

let PaystackWebView: any = null;
try {
  const mod = require('react-native-paystack-webview');
  PaystackWebView = mod.Paystack || mod.default;
} catch (_) {}

const PAYSTACK_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

type Address = {
  _id: string; name: string; addressLine1: string;
  city: string; state: string; postalCode: string;
  country: string; isDefault: boolean; estimatedDeliveryPrice?: number;
  latitude?: number; longitude?: number;
};

const Section = ({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </Animated.View>
);

export default function CheckoutScreen() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<'home' | 'station'>('home');
  const [showPaystack, setShowPaystack] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const { data: addresses = [], isLoading: loadingAddresses } = useQuery<Address[]>({
    queryKey: ['shippingAddresses'],
    queryFn: async () => {
      const res = await axiosInstance.get('/shipping/api/shipping-addresses');
      return res.data.data || [];
    },
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const def = addresses.find(a => a.isDefault) || addresses[0];
      setSelectedAddress(def);
    }
  }, [addresses, selectedAddress]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = deliveryOption === 'station' ? 0 :
    (selectedAddress?.estimatedDeliveryPrice ?? 500);
  const total = subtotal + shipping;

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAddress && deliveryOption === 'home') {
        throw new Error('Please select a delivery address');
      }
      const payload = {
        products: items.map(i => ({ product: i._id, quantity: i.quantity })),
        shippingAddress: selectedAddress
          ? {
              name: selectedAddress.name,
              addressLine1: selectedAddress.addressLine1,
              city: selectedAddress.city,
              state: selectedAddress.state,
              postalCode: selectedAddress.postalCode,
              country: selectedAddress.country,
            }
          : { name: 'Pickup Station', addressLine1: 'Lagos Central Station', city: 'Lagos', state: 'Lagos', postalCode: '100001', country: 'Nigeria' },
        shippingCost: shipping,
        deliveryOption,
      };
      const res = await axiosInstance.post('/marketplace/api/orders', payload);
      return res.data;
    },
    onSuccess: (data) => {
      clearCart();
      Toast.show({ type: 'success', text1: '🎉 Order placed!', text2: 'Your order is being processed' });
      router.replace({
        pathname: '/(routes)/order-confirmation',
        params: { orderId: data.data?._id || '', total: String(total) },
      } as any);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err.message || 'Failed to place order';
      Alert.alert('Order Failed', msg);
    },
  });

  const handlePay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (items.length === 0) return Alert.alert('Empty Cart', 'Add items to your cart first');
    if (deliveryOption === 'home' && !selectedAddress) return Alert.alert('No Address', 'Please add a delivery address');

    if (PAYSTACK_KEY && PaystackWebView) {
      setShowPaystack(true);
    } else {
      orderMutation.mutate();
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      {/* Paystack Modal */}
      {showPaystack && PaystackWebView && user && (
        <Modal visible={showPaystack} animationType="slide">
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setShowPaystack(false)} style={styles.closePaystack}>
              <Ionicons name="close" size={28} color="#111" />
              <Text style={{ color: '#111', marginLeft: 8, fontWeight: '600' }}>Cancel Payment</Text>
            </TouchableOpacity>
            <PaystackWebView
              paystackKey={PAYSTACK_KEY}
              amount={total}
              billingEmail={user.email}
              billingName={user.name}
              currency="NGN"
              onCancel={() => setShowPaystack(false)}
              onSuccess={() => {
                setShowPaystack(false);
                orderMutation.mutate();
              }}
              activityIndicatorColor="#FF8C00"
            />
          </SafeAreaView>
        </Modal>
      )}

      {/* Address Picker Modal */}
      <Modal visible={showAddressPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.addressPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Address</Text>
              <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr._id}
                  style={[styles.addrOption, selectedAddress?._id === addr._id && styles.addrOptionSelected]}
                  onPress={() => { setSelectedAddress(addr); setShowAddressPicker(false); }}
                >
                  <Ionicons name="location" size={20} color={selectedAddress?._id === addr._id ? '#FF8C00' : '#6B7280'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.addrName}>{addr.name}</Text>
                    <Text style={styles.addrDetail}>{addr.addressLine1}, {addr.city}, {addr.state}</Text>
                    {addr.estimatedDeliveryPrice !== undefined && (
                      <Text style={styles.addrDelivery}>Delivery: ₦{addr.estimatedDeliveryPrice.toLocaleString()}</Text>
                    )}
                  </View>
                  {selectedAddress?._id === addr._id && <Ionicons name="checkmark-circle" size={20} color="#FF8C00" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addAddrBtn}
                onPress={() => { setShowAddressPicker(false); router.push('/(routes)/shipping/add' as any); }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FF8C00" />
                <Text style={styles.addAddrText}>Add New Address</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Delivery Address */}
          <Section title="📍 Delivery Address" delay={100}>
            {loadingAddresses ? (
              <ActivityIndicator color="#FF8C00" />
            ) : selectedAddress ? (
              <TouchableOpacity style={styles.addressRow} onPress={() => setShowAddressPicker(true)}>
                <Ionicons name="location" size={22} color="#FF8C00" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.addressName}>{selectedAddress.name}</Text>
                  <Text style={styles.addressDetail}>{selectedAddress.addressLine1}, {selectedAddress.city}</Text>
                  {selectedAddress.estimatedDeliveryPrice !== undefined && (
                    <Text style={styles.addressDelivery}>🚚 ₦{selectedAddress.estimatedDeliveryPrice.toLocaleString()} delivery fee</Text>
                  )}
                </View>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addAddrEmptyBtn} onPress={() => router.push('/(routes)/shipping/add' as any)}>
                <Ionicons name="add-circle-outline" size={20} color="#FF8C00" />
                <Text style={styles.addAddrEmptyText}>Add Delivery Address</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* Delivery Method */}
          <Section title="🚚 Delivery Method" delay={180}>
            <TouchableOpacity
              style={[styles.deliveryOpt, deliveryOption === 'home' && styles.deliveryOptActive]}
              onPress={() => { Haptics.selectionAsync(); setDeliveryOption('home'); }}
            >
              <Ionicons name="home" size={20} color={deliveryOption === 'home' ? '#FF8C00' : '#6B7280'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.deliveryOptTitle, deliveryOption === 'home' && { color: '#FF8C00' }]}>Home Delivery</Text>
                <Text style={styles.deliveryOptSub}>Delivered to your door</Text>
              </View>
              <Text style={styles.deliveryOptPrice}>₦{(selectedAddress?.estimatedDeliveryPrice ?? 500).toLocaleString()}</Text>
              {deliveryOption === 'home' && <Ionicons name="checkmark-circle" size={18} color="#FF8C00" style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
            <View style={styles.deliveryDivider} />
            <TouchableOpacity
              style={[styles.deliveryOpt, deliveryOption === 'station' && styles.deliveryOptActive]}
              onPress={() => { Haptics.selectionAsync(); setDeliveryOption('station'); }}
            >
              <Ionicons name="business" size={20} color={deliveryOption === 'station' ? '#FF8C00' : '#6B7280'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.deliveryOptTitle, deliveryOption === 'station' && { color: '#FF8C00' }]}>Pickup Station</Text>
                <Text style={styles.deliveryOptSub}>Lagos Central Station</Text>
              </View>
              <Text style={[styles.deliveryOptPrice, { color: '#10B981' }]}>FREE</Text>
              {deliveryOption === 'station' && <Ionicons name="checkmark-circle" size={18} color="#FF8C00" style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
          </Section>

          {/* Order Items */}
          <Section title={`🛒 Order Items (${items.length})`} delay={260}>
            {items.map((item, i) => (
              <Animated.View key={item._id} entering={FadeInRight.delay(i * 60)} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                </View>
                <Text style={styles.orderItemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
              </Animated.View>
            ))}
          </Section>

          {/* Summary */}
          <Section title="💰 Order Summary" delay={340}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₦{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={[styles.summaryValue, shipping === 0 && { color: '#10B981' }]}>
                {shipping === 0 ? 'FREE' : `₦${shipping.toLocaleString()}`}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₦{total.toLocaleString()}</Text>
            </View>
          </Section>
        </ScrollView>

        {/* Place Order Footer */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
          <TouchableOpacity
            style={[styles.payBtn, orderMutation.isPending && styles.payBtnDisabled]}
            onPress={handlePay}
            disabled={orderMutation.isPending}
          >
            {orderMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.payBtnText}>Pay ₦{total.toLocaleString()}</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.secureNote}>🔒 Secured by Paystack</Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 120, gap: 16 },
  section: {},
  sectionTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  addressDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addressDelivery: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 3 },
  changeText: { color: '#FF8C00', fontWeight: '700', fontSize: 13 },
  addAddrEmptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  addAddrEmptyText: { color: '#FF8C00', fontWeight: '700', fontSize: 15 },
  deliveryOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  deliveryOptActive: { backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 10 },
  deliveryOptTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  deliveryOptSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  deliveryOptPrice: { fontSize: 14, fontWeight: '700', color: '#111827' },
  deliveryDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  orderItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderItemName: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
  orderItemQty: { fontSize: 13, color: '#9CA3AF', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  orderItemPrice: { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 17, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#FF8C00' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(75,46,5,0.95)', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  payBtn: { backgroundColor: '#FF8C00', borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  payBtnDisabled: { backgroundColor: '#FDBA74' },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secureNote: { textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 },
  closePaystack: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  addressPickerModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  addrOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10 },
  addrOptionSelected: { borderColor: '#FF8C00', backgroundColor: '#FFF7ED' },
  addrName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addrDetail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addrDelivery: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  addAddrBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, justifyContent: 'center' },
  addAddrText: { color: '#FF8C00', fontWeight: '700', fontSize: 15 },
});
