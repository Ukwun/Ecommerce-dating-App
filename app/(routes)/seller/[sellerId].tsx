import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '@/components/home/products';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import axiosInstance from '@/utils/axiosinstance';

export default function SellerProfileScreen() {
  const { sellerId, name, avatar } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, fetch seller details and products using sellerId
  const sellerName = name || 'Verified Seller';
  const sellerAvatar = avatar || 'https://via.placeholder.com/150';

  useEffect(() => {
    const fetchSellerProducts = async () => {
      try {
        const response = await axiosInstance.get(`/marketplace/api/products?seller=${sellerId}`);
        const mappedProducts = (response.data.data || []).map((p: any) => ({
          ...p,
          name: p.title,
          image: p.thumbnail || (p.images && p.images[0]) || 'https://via.placeholder.com/150'
        }));
        setProducts(mappedProducts);
      } catch (error) {
        console.error('Failed to fetch seller products', error);
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchSellerProducts();
    }
  }, [sellerId]);

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.profileSection}>
          <Image source={{ uri: sellerAvatar as string }} style={styles.avatar} />
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{sellerName}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginLeft: 6 }} />
            </View>
            <Text style={styles.stats}>4.9 ★ (1.2k reviews) • 500+ Sales</Text>
          </View>
        </View>

        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Products</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#FF8C00" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={{ flex: 0.5, padding: 4 }}>
                   <ProductCard
                    item={item}
                    wishlist={wishlistIds}
                    toggleWishlist={toggleWishlist}
                    addToCart={addToCart}
                  />
                </View>
              )}
              numColumns={2}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>No products found for this seller.</Text>}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileSection: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  infoContainer: { marginTop: 12, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  stats: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  productsContainer: { flex: 1, backgroundColor: '#F3F4F6', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16, marginLeft: 4 },
});