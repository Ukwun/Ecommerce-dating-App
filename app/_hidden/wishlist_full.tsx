import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { ProductCard } from '@/components/home/products';
import { useCart } from '@/hooks/CartContext';
import ProductSkeleton from '@/components/skeleton/product.skeleton';
import { useWishlist } from '@/hooks/useWishlist';

export default function WishlistScreen() {
  const { addToCart } = useCart();
  const { wishlistIds, wishlistProducts, isLoadingWishlist, toggleWishlist } = useWishlist();
  const queryClient = useQueryClient();

  const handleToggleWishlist = (id: string) => {
    toggleWishlist(id);
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Your Wishlist is Empty</Text>
      <Text style={styles.emptySubText}>Tap the heart on any product to save it here.</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wishlist</Text>
        </View>

        {isLoadingWishlist ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((_, i) => <ProductSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={wishlistProducts}
            renderItem={({ item }) => <ProductCard item={item} wishlist={wishlistIds} toggleWishlist={handleToggleWishlist} addToCart={addToCart} />}
            keyExtractor={(item) => item._id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 14 }}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={isLoadingWishlist} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['wishlist'] })} tintColor="#fff" />}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  emptySubText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginTop: 8, textAlign: 'center' },
});
