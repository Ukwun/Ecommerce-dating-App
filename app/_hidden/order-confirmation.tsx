import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderConfirmationScreen({ route }: any) {
  const orderId = route?.params?.orderId ?? 'N/A';
  const total = route?.params?.total ?? '0';
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Order Confirmed</Text>
        <Text style={styles.subtitle}>Order ID: {orderId}</Text>
        <Text style={styles.subtitle}>Total: ₦{total}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#444' },
});
