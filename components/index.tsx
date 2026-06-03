import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import axiosInstance from '../utils/axiosinstance';
// Correcting paths to match actual project structure for realistic loading
import { RelatedProducts } from '../components/RelatedProducts';
import { InteractiveAddToCart } from '../backend/routes/InteractiveAddToCart';
import { FlyingItem } from '../backend/routes/FlyingItem';
export { AnimatedCheckbox } from './AnimatedCheckbox';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flyingItem, setFlyingItem] = useState<{ start: { x: number, y: number }, image: string } | null>(null);

  // Coordinate for the cart icon in the header (Top Right)
  const cartPos = { x: width - 40, y: 40 }; 

  useEffect(() => {
    if (id) fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      // Fetching enriched data (Seller + Similar Products + Reviews)
      const response = await axiosInstance.get(`/products/api/products/${id}`);
      if (response.data.success) {
        setProduct(response.data.data);
        
        // Intelligence: Log the product view to the Recommendation Engine
        await axiosInstance.post('/marketplace/api/activity/log', {
          activityType: 'product_view',
          productId: id,
          category: response.data.data.category,
          price: response.data.data.price
        });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (x: number, y: number) => {
    setFlyingItem({ 
      start: { x, y }, 
      image: product?.images?.[0] || 'https://via.placeholder.com/150'
    });
    
    // Optimistic background API call
    axiosInstance.post('/cart/api/cart/add', { 
      productId: product._id, 
      quantity: 1 
    }).catch(() => {
      console.warn("Could not sync cart to server");
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.Image 
          entering={FadeIn.duration(600)}
          source={{ uri: product.images?.[0] || 'https://via.placeholder.com/400' }} 
          style={styles.mainImage} 
        />
        
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{product.name}</Text>
              <InteractiveAddToCart 
                onPress={handleAddToCart}
                isFavorite={product.isFavorite}
                onFavoritePress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
              />
            </View>
            
            <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>
            
            <View style={styles.sellerSection}>
              <Image source={{ uri: product.seller?.avatar || 'https://via.placeholder.com/50' }} style={styles.sellerAvatar} />
              <View>
                <Text style={styles.sellerName}>{product.seller?.businessName || product.seller?.name}</Text>
                <Text style={styles.sellerStats}>
                  {product.seller?.verified && <Ionicons name="checkmark-circle" size={12} color="#007AFF" />} 
                  {product.seller?.averageRating || '4.5'} Rating • Joined {product.seller?.joinedDate ? new Date(product.seller.joinedDate).getFullYear() : '2024'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>

            {/* Intelligence in action: Similar products powered by RecommendationEngine */}
            <RelatedProducts products={product.similarProducts} />
          </Animated.View>
        </View>
      </ScrollView>

      {/* Flying animation overlay */}
      {flyingItem && (
        <FlyingItem 
          startPos={flyingItem.start}
          endPos={cartPos}
          imageUri={flyingItem.image}
          onComplete={() => setFlyingItem(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#8E8E93', marginTop: 10 },
  mainImage: { width: '100%', height: 400, backgroundColor: '#f0f0f0' },
  content: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1C1E', flex: 1, marginRight: 15 },
  price: { fontSize: 24, fontWeight: '700', color: '#007AFF', marginTop: 8 },
  sellerSection: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, padding: 16, backgroundColor: '#F2F2F7', borderRadius: 20 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  sellerName: { fontSize: 16, fontWeight: '700' },
  sellerStats: { fontSize: 12, color: '#8E8E93', marginTop: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginTop: 28, marginBottom: 12, color: '#1C1C1E' },
  description: { fontSize: 16, color: '#3A3A3C', lineHeight: 24 }
});