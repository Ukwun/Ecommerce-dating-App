import React, { useRef, useEffect } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, RefreshControl, findNodeHandle } from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useCart } from "@/hooks/CartContext";
import { useTheme } from "@/hooks/useTheme";
import { useWishlist } from '@/hooks/useWishlist';
import { useSharedElement } from "@/hooks/useSharedElement";

// Only import LottieView on native platforms
let LottieView: any = null;
try {
  const module = require('lottie-react-native');
  LottieView = module.default || module;
} catch (e) {
  // Fallback for web or if module is not available
}


type Product = {
  _id: string;
  id?: string; // Add optional id for compatibility
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating?: number;
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
  // Ensure handleToggle always has signature (id: string) => void
  const handleToggle =
    toggleWishlist ??
    ((id: string) => {
      // localToggle handles determining the action internally
      localToggle(id);
    });

  const renderItem = ({ item, index }: { item: Product, index: number }) => (
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
}: ProductCardProps & { addToCart: (product: any) => void; }) => {
 const { isDark } = useTheme();
  const inWishlist = wishlist?.includes(item._id);
  const { setSharedElement } = useSharedElement();
  const imageRef = useRef<Image>(null);
  const lottieRef = useRef<any>(null);

  const handleToggleWishlist = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleWishlist?.(item._id);
  };

  const handleAddToCart = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lottieRef.current?.play(0, 90); // Play the Lottie animation
    addToCart(item);
  };

  const handleCardPress = () => {
  if (imageRef.current){
      const node = findNodeHandle(imageRef.current);
      if (node) {
        imageRef.current.measure((x, y, width, height, pageX, pageY) => {
          setSharedElement(item, { x: pageX, y: pageY, width, height });
          router.push(`/product/${item._id}`);
        });
  };
 }
 };

  // Fallback image in case item.image is missing
  const placeholderImage = 'https://via.placeholder.com/150';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: (index ?? 0) * 100 }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.card,
   { backgroundColor: isDark ? '#374151' : '#FFFFFF' }
  ]}
        onPress={handleCardPress}
      >
        {/* Product Image */}
        <View style={styles.imageWrapper}>
          <Image
          ref={imageRef}
          source={{ uri: item.image || placeholderImage }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Wishlist Heart */}
        <TouchableOpacity style={styles.heartIcon} onPress={handleToggleWishlist}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: inWishlist ? 1.3 : 1 }}
              transition={{ type: 'spring', duration: 300, overshootClamping: true }}
            >
              <AntDesign name={inWishlist ? "heart" : "heart"} size={18} color={inWishlist ? "#FF6B6B" : "#fff"} />
            </MotiView>
        </TouchableOpacity>
      </View>

      {/* Product Info */}
      <View style={styles.details}>
        <Text numberOfLines={1} style={[styles.name, { color: isDark ? '#F3F4F6' : '#333' }]}>
          {item.name}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
          {item.oldPrice && (
            <Text style={styles.oldPrice}>
              ₦{item.oldPrice.toLocaleString()}
            </Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          {/* Rating */}
          <View style={styles.ratingRow}>
            <AntDesign name="star" size={14} color="#FFD700" />
            <Text style={[styles.ratingText, { color: isDark ? '#D1D5DB' : '#444' }]}>
              {item.rating ? item.rating.toFixed(1) : "4.5"}
            </Text>
          </View>
          {/* Add to Cart Button */}
            <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
                <Ionicons name="cart-outline" size={20} color="#fff" />
                {LottieView && (
                  <LottieView
                    ref={lottieRef}
                    source={require('@/assets/lottie/add-to-cart.json')}
                    autoPlay={false}
                    loop={false}
                    style={styles.lottieAnimation}
                    speed={2}
                    onAnimationFinish={() => lottieRef.current?.reset()}
                  />
                )}
            </TouchableOpacity>
        </View>
      </View>
      </TouchableOpacity>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff", // This assumes a dark background, adjust if needed
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 14,
    marginBottom: 16,
    flex: 0.48,
    shadowColor: "#000000",
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
  image: {
    width: "100%",
    height: "100%",
  },
  heartIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 6,
    borderRadius: 20,
  },
  details: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF8C00",
  },
  oldPrice: {
    fontSize: 12,
    color: "#888",
    textDecorationLine: "line-through",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addToCartButton: {
    backgroundColor: '#FF8C00',
    padding: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  lottieAnimation: {
    position: 'absolute',
    width: 80,
    height: 80,
    bottom: -18,
    right: -18,
    opacity: 0.9,
  },
});
