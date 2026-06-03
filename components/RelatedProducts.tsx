import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import axiosInstance from '../utils/axiosinstance';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

interface Product {
  _id: string;
  name: string;
  price: number;
  images: string[];
  ratings?: number;
}

interface RelatedProductsProps {
  products: Product[];
}

export const RelatedProducts = ({ products }: RelatedProductsProps) => {
  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You May Also Like</Text>
      <FlatList
        data={products}
        renderItem={({ item, index }) => <RelatedProductCard item={item} index={index} />}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </View>
  );
};

const RelatedProductCard = ({ item, index }: { item: Product; index: number }) => {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });

    // Intelligence: Log the click to refine future recommendations
    try {
      await axiosInstance.post('/marketplace/api/activity/log', {
        activityType: 'product_click',
        productId: item._id,
        metadata: { source: 'related_products_section' }
      });
    } catch (e) { /* silent log failure */ }

    router.push({
      pathname: "/(routes)/product-details",
      params: { id: item._id }
    });
  };

  return (
    <Animated.View 
      entering={FadeInRight.delay(index * 100).duration(500)}
      style={[styles.cardContainer, animatedStyle]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Image 
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} 
          style={styles.image}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={styles.ratingText}>{item.ratings || '4.5'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', marginLeft: 16, marginBottom: 16, color: '#1C1C1E' },
  listContent: { paddingHorizontal: 16 },
  cardContainer: { width: CARD_WIDTH, marginRight: 12, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  image: { width: '100%', height: 120, backgroundColor: '#f0f0f0' },
  info: { padding: 10 },
  name: { fontSize: 13, color: '#444', marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
  rating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 10, color: '#888', marginLeft: 2 }
});