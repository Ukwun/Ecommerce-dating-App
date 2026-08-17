import React, { useRef } from "react";
import {
  View, Text, Image, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, findNodeHandle,
} from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
  withTiming, FadeInDown, ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCart } from "@/hooks/CartContext";
import { useTheme } from "@/hooks/useTheme";
import { useWishlist } from '@/hooks/useWishlist';
import { useSharedElement } from "@/hooks/useSharedElement";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Product = {
  _id: string;
  id?: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  category?: string;
  stock?: number;
};

type Props = {
  title: string;
  products: Product[];
  onRefresh: () => void;
  refreshing: boolean;
  toggleWishlist: (id: string) => void;
};

type ProductCardProps = {
  item: Product;
  wishlist?: string[];
  toggleWishlist?: (id: string) => void;
  index?: number;
};

export default function ProductSection({
  title,
  products,
  onRefresh,
  refreshing,
  toggleWishlist,
}: Props) {
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist: localToggle } = useWishlist();
  const handleToggle = toggleWishlist ?? ((id: string) => { localToggle(id); });

  const renderItem = ({ item, index }: { item: Product; index: number }) => (
    <ProductCard item={item} addToCart={addToCart} wishlist={wishlistIds} toggleWishlist={handleToggle} index={index} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 2 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

export const ProductCard = ({
  item,
  addToCart,
  wishlist,
  toggleWishlist,
  index,
}: ProductCardProps & { addToCart: (product: any) => void }) => {
  const { isDark } = useTheme();
  const inWishlist = wishlist?.includes(item._id);
  const { setSharedElement } = useSharedElement();
  const imageRef = useRef<Image>(null);

  const cardScale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const cartScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const cartStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartScale.value }] }));

  const handleToggleWishlist = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(withSpring(1.6), withSpring(0.9), withSpring(1));
    toggleWishlist?.(item._id);
  };

  const handleAddToCart = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cartScale.value = withSequence(withSpring(0.75), withSpring(1.25), withSpring(1));
    addToCart(item);
  };

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (imageRef.current) {
      const node = findNodeHandle(imageRef.current);
      if (node) {
        imageRef.current.measure((x, y, w, h, pageX, pageY) => {
          setSharedElement(item, { x: pageX, y: pageY, width: w, height: h });
          router.push(`/(routes)/product/${item._id}` as any);
        });
        return;
      }
    }
    router.push(`/(routes)/product/${item._id}` as any);
  };

  const placeholderImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300';

  return (
    <Animated.View
      entering={FadeInDown.delay((index || 0) * 60).springify()}
      style={cardStyle}
    >
      <AnimatedTouchable
        activeOpacity={1}
        style={[styles.card, { backgroundColor: isDark ? '#374151' : '#FFFFFF' }]}
        onPressIn={() => { cardScale.value = withSpring(0.96); }}
        onPressOut={() => { cardScale.value = withSpring(1); }}
        onPress={handleCardPress}
      >
        {/* Image */}
        <View style={styles.imageWrapper}>
          <Image
            ref={imageRef}
            source={{ uri: item.image || placeholderImage }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Wishlist Heart */}
          <Animated.View style={[styles.heartIcon, heartStyle]}>
            <TouchableOpacity
              onPress={handleToggleWishlist}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={18}
                color={inWishlist ? "#FF6B6B" : "#fff"}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Stock Badge */}
          {item.stock !== undefined && item.stock < 10 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>
                {item.stock === 0 ? 'Out of Stock' : `${item.stock} left`}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.details}>
          {item.category && (
            <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
          )}
          <Text numberOfLines={1} style={[styles.name, { color: isDark ? '#F3F4F6' : '#333' }]}>
            {item.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
            {item.oldPrice && (
              <Text style={styles.oldPrice}>₦{item.oldPrice.toLocaleString()}</Text>
            )}
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.ratingRow}>
              <AntDesign name="star" size={14} color="#FFD700" />
              <Text style={[styles.ratingText, { color: isDark ? '#D1D5DB' : '#444' }]}>
                {item.rating ? item.rating.toFixed(1) : "4.5"}
              </Text>
            </View>
            <Animated.View style={cartStyle}>
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={handleAddToCart}
                activeOpacity={0.75}
              >
                <Ionicons name="cart" size={18} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 14, paddingHorizontal: 2 },
  card: {
    borderRadius: 14,
    marginBottom: 16,
    flex: 0.48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 150,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  heartIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 6,
    borderRadius: 20,
  },
  stockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(220,38,38,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 8,
  },
  stockText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  details: { padding: 10 },
  category: { fontSize: 10, color: '#888', marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
  name: { fontSize: 13, fontWeight: "600" },
  priceContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontSize: 14, fontWeight: "700", color: "#FF8C00" },
  oldPrice: { fontSize: 12, color: "#888", textDecorationLine: "line-through" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { marginLeft: 4, fontSize: 13 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addToCartButton: {
    backgroundColor: '#FF8C00',
    padding: 7,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#FF8C00',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
