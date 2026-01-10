import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useCart } from '@/hooks/CartContext';
import { useCheckout } from '@/hooks/CheckoutContext';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { getCachedRates, convert } from '@/utils/currency';

const CartItem = ({ item, onUpdateQuantity, onRemove, currency, convertFn }: { item: any, onUpdateQuantity: any, onRemove: any, currency: string, convertFn?: (n:number)=>Promise<number> }) => {
  const [converted, setConverted] = useState<number | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (convertFn && currency !== 'NGN') {
        try {
          setLoadingConv(true);
          const c = await convertFn(item.price);
          if (mounted) setConverted(c);
        } finally {
          if (mounted) setLoadingConv(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [item.price, currency]);

  const displayPrice = () => {
    if (currency === 'NGN') return `₦${item.price.toLocaleString()}`;
    if (loadingConv) return 'Loading...';
    if (converted !== null) {
      if (currency === 'USD') return `$${converted.toFixed(2)}`;
      if (currency === 'EUR') return `€${converted.toFixed(2)}`;
    }
    // fallback
    return `₦${item.price.toLocaleString()}`;
  };

  return (
  <View style={styles.itemContainer}>
    <Image source={{ uri: item.image }} style={styles.itemImage} />
    <View style={styles.itemDetails}>
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.itemPrice}>{displayPrice()}</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity onPress={() => onUpdateQuantity(item.id, -1)} style={styles.quantityButton}>
          <Ionicons name="remove" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => onUpdateQuantity(item.id, 1)} style={styles.quantityButton}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
    <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.removeButton}>
      <Ionicons name="trash-outline" size={20} color="#FF8C00" />
    </TouchableOpacity>
  </View>
  );
};


export default function CartScreen() {
  const { items, updateQuantity, removeFromCart } = useCart();

  const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
  const { deliveryOption, currency } = useCheckout();
  // Adjust shipping cost based on delivery preference
  const shipping = deliveryOption === 'station' ? 0 : 500;
  const total = subtotal + shipping;

  const fmt = (amount: number) => {
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    if (currency === 'EUR') return `€${amount.toFixed(2)}`;
    return `₦${amount.toLocaleString()}`;
  };

  const [rates, setRates] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await getCachedRates('NGN', [currency]);
        if (mounted) setRates(r);
      } catch (e) {
        // ignore
      }
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

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LottieView
              source={require('@/assets/lottie/empty-cart.json')}
              autoPlay
              loop
              style={{ width: 200, height: 200 }}
            />
            <Text style={styles.emptyText}>Your cart is lonely 😢</Text>
            <Text style={styles.emptySubText}>Add some products to make it happy!</Text>
          </View>
        ) : (
          <ScrollView>
            {items.map(item => (
              <CartItem
                key={item._id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                currency={currency}
                convertFn={(n:number) => convert(n, 'NGN', currency)}
              />
            ))}

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{fmt(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>{fmt(shipping)}</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
                <Text style={[styles.summaryValue, styles.totalLabel]}>{fmt(total)}</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {items.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.checkoutButton} onPress={() => router.push('/_hidden/checkout')}>
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  itemContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 12, alignItems: 'center' },
  itemImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: '#FF8C00', marginBottom: 8 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityButton: { backgroundColor: '#FF8C00', borderRadius: 6, padding: 4 },
  quantityText: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginHorizontal: 12 },
  removeButton: { padding: 8 },
  summaryContainer: { backgroundColor: 'rgba(255,255,255,0.9)', margin: 16, borderRadius: 12, padding: 16 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 16, color: '#444' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  totalLabel: { fontWeight: 'bold', fontSize: 18 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  checkoutButton: { backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  checkoutButtonText: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
});
 
