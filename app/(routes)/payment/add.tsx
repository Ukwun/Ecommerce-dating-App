import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';

export default function AddPaymentMethodScreen() {
  const [loading, setLoading] = useState(false);

  const authorizeCard = async () => {
    setLoading(true);
    try {
      const initialized = await axiosInstance.post('/marketplace/api/payment-methods/initialize');
      const { authorization_url: authorizationUrl, reference } = initialized.data.data;
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, 'marketplace://payment-method-added');
      if (result.type !== 'success') return;
      await axiosInstance.post('/marketplace/api/payment-methods/verify', { reference, isDefault: true });
      Toast.show({ type: 'success', text1: 'Card saved securely', text2: 'The ₦50 verification charge is being refunded.' });
      router.back();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not save card', text2: error?.response?.data?.error || error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity>
        <Text style={styles.title}>Add a payment card</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.icon}><Ionicons name="shield-checkmark" size={48} color="#2563EB" /></View>
        <Text style={styles.heading}>Secure card authorization</Text>
        <Text style={styles.body}>Your card details are entered only on Paystack’s secure checkout. This app stores a reusable authorization token and masked card details—never your card number or CVV.</Text>
        <Text style={styles.note}>Paystack charges ₦50 to verify the card. The app immediately initiates a refund after successful authorization.</Text>
        <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={authorizeCard} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue securely</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  content: { flex: 1, justifyContent: 'center', padding: 28 },
  icon: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heading: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center' },
  body: { color: '#4B5563', lineHeight: 22, textAlign: 'center', marginTop: 12 },
  note: { color: '#92400E', backgroundColor: '#FFFBEB', padding: 14, borderRadius: 12, lineHeight: 20, marginTop: 20 },
  button: { backgroundColor: '#2563EB', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 28 },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
